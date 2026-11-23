<?php

/**
 * Contrôleur pour l'importation des bouteilles depuis la SAQ (via GraphQL Magento).
 */
class SaqControleur extends Controleur
{

    const DUPLICATION = 'duplication';
    const ERREURDB = 'erreurdb';
    const INSERE = 'Nouvelle bouteille insérée';

    private const SAQ_GRAPHQL_URL = 'https://www.saq.com/graphql';
    private const SAQ_BASE_URL = 'https://www.saq.com/fr/';
    /** Tranches de prix pour contourner la limite Magento (currentPage * pageSize ≤ 10 000). */
    private const TRANCHES_PRIX = [
        ['from' => '0', 'to' => '15'],
        ['from' => '15', 'to' => '25'],
        ['from' => '25', 'to' => '40'],
        ['from' => '40', 'to' => '60'],
        ['from' => '60', 'to' => '100'],
        ['from' => '100', 'to' => '99999'],
    ];

  private static $_webpage;
    private static $_status;
    private $stmt;

    private function categoryPathForType($type)
    {
        $paths = [
            'rouge' => 'produits/vin/vin-rouge',
            'blanc' => 'produits/vin/vin-blanc',
            'rose' => 'produits/vin/vin-rose',
        ];

        return $paths[$type] ?? $paths['rouge'];
    }

    private function fetchGraphQL($query)
    {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('L\'extension PHP curl est requise pour la synchronisation SAQ (paquet php-curl).');
        }

        $payload = json_encode(['query' => $query]);
        $s = curl_init();
        curl_setopt_array($s, [
            CURLOPT_URL => self::SAQ_GRAPHQL_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT => 60,
        ]);

        $response = curl_exec($s);
        $status = curl_getinfo($s, CURLINFO_HTTP_CODE);
        curl_close($s);

        if ($response === false || $status < 200 || $status >= 300) {
            throw new RuntimeException('Impossible de contacter le service SAQ (HTTP ' . $status . ').');
        }

        $data = json_decode($response);
        if (!$data || isset($data->errors)) {
            $message = isset($data->errors[0]->message) ? $data->errors[0]->message : 'Réponse SAQ invalide.';
            throw new RuntimeException($message);
        }

        return $data;
    }

    /**
     * SAQ text often arrives HTML-entity encoded (&eacute;, sometimes double-encoded).
     */
    private function decodeHtmlEntities($value)
    {
        $text = (string) $value;
        for ($i = 0; $i < 3; $i++) {
            $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ($decoded === $text) {
                break;
            }
            $text = $decoded;
        }
        return $text;
    }

    private function truncate($value, $maxLength)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return $value;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($value, 0, $maxLength);
        }
        return substr($value, 0, $maxLength);
    }

    private function imageUrl($attrs, $item)
    {
        if (!empty($attrs['image'])) {
            return 'https://www.saq.com/media/catalog/product' . $attrs['image'];
        }
        $url = $item->small_image->url ?? '';
        if ($url !== '' && strpos($url, '?') !== false) {
            $url = strtok($url, '?');
        }
        return $url;
    }

    private function attributeMap($customAttributes)
    {
        $map = [];
        if (!$customAttributes || !isset($customAttributes->items)) {
            return $map;
        }

        foreach ($customAttributes->items as $item) {
            if (isset($item->value)) {
                $map[$item->code] = $item->value;
            } elseif (isset($item->selected_options[0]->label)) {
                $map[$item->code] = trim($item->selected_options[0]->label);
            }
        }

        return $map;
    }

    private function productFromGraphQL($item)
    {
        $attrs = $this->attributeMap($item->custom_attributesV2 ?? null);

        $info = new stdClass();
        $info->img = $this->truncate($this->imageUrl($attrs, $item), 200);
        $info->url = $this->truncate(self::SAQ_BASE_URL . ($item->url_key ?? $item->sku), 200);
        $info->nom = $this->truncate($this->decodeHtmlEntities($item->name ?? ''), 200);
        $info->prix = $item->price_range->minimum_price->final_price->value ?? 0;

        $info->desc = new stdClass();
        $info->desc->type = $this->decodeHtmlEntities($attrs['identite_produit'] ?? 'Vin rouge');
        $format = $attrs['format_contenant_ml'] ?? '';
        $info->desc->format = $this->truncate($format !== '' ? $format . ' ml' : '', 45);
        $info->desc->pays = $this->truncate(
            $this->decodeHtmlEntities($attrs['pays_origine'] ?? ''),
            45
        );
        $info->desc->code_SAQ = $this->truncate($item->sku ?? '', 45);
        $millesime = preg_replace('/\D+/', '', (string) ($attrs['millesime_produit'] ?? ''));
        if ($millesime !== '' && strlen($millesime) === 4) {
            $info->desc->millesime = (int) $millesime;
        } elseif (preg_match('/\b(19|20)\d{2}\b/', $info->nom, $m)) {
            $info->desc->millesime = (int) $m[0];
        } else {
            $info->desc->millesime = null;
        }
        $description = $this->decodeHtmlEntities($attrs['meta_description'] ?? '');
        if ($description === '') {
            $description = trim($info->desc->type . ' | ' . $info->desc->format . ' | ' . $info->desc->pays);
        }
        $info->desc->texte = $this->truncate($description, 200);

        return $info;
    }

    private function prixFilterGraphQL($prixMin, $prixMax)
    {
        if ($prixMin === null || $prixMax === null) {
            return '';
        }

        return ', price: { from: "' . $prixMin . '", to: "' . $prixMax . '" }';
    }

    private function fetchProductsPage($type, $page, $pageSize, $includeItems = true, $prixMin = null, $prixMax = null)
    {
        $categoryPath = $this->categoryPathForType($type);
        $itemsSelection = $includeItems
            ? 'items {
                sku
                name
                url_key
                price_range { minimum_price { final_price { value } } }
                small_image { url }
                custom_attributesV2 {
                    items {
                        code
                        ... on AttributeValue { value }
                        ... on AttributeSelectedOptions { selected_options { label } }
                    }
                }
            }'
            : '';

        $query = '{ products(filter: { category_url_path: { eq: "' . $categoryPath . '" }'
            . $this->prixFilterGraphQL($prixMin, $prixMax) . ' }, pageSize: '
            . intval($pageSize) . ', currentPage: ' . intval($page) . ') { total_count ' . $itemsSelection . ' } }';
        $query = preg_replace('/\s+/', ' ', trim($query));

        $data = $this->fetchGraphQL($query);
        return $data->data->products ?? null;
    }

    /**
     * Découpe un type de vin en tranches de prix pour contourner la limite de pagination Magento.
     */
    private function tranchesPrixPourType($type)
    {
        $tranches = [];
        // Parallelize tranche probes with curl_multi when available.
        if (!function_exists('curl_multi_init')) {
            foreach (self::TRANCHES_PRIX as $tranche) {
                $products = $this->fetchProductsPage($type, 1, 1, false, $tranche['from'], $tranche['to']);
                $total = isset($products->total_count) ? intval($products->total_count) : 0;
                if ($total > 0) {
                    $tranches[] = [
                        'prixMin' => $tranche['from'],
                        'prixMax' => $tranche['to'],
                        'total' => $total,
                    ];
                }
            }
            return $tranches;
        }

        $mh = curl_multi_init();
        $handles = [];
        foreach (self::TRANCHES_PRIX as $idx => $tranche) {
            $categoryPath = $this->categoryPathForType($type);
            $query = '{ products(filter: { category_url_path: { eq: "' . $categoryPath . '" }'
                . $this->prixFilterGraphQL($tranche['from'], $tranche['to'])
                . ' }, pageSize: 1, currentPage: 1) { total_count } }';
            $query = preg_replace('/\s+/', ' ', trim($query));
            $payload = json_encode(['query' => $query]);
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => self::SAQ_GRAPHQL_URL,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
                CURLOPT_TIMEOUT => 60,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$idx] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running) {
                curl_multi_select($mh, 1.0);
            }
        } while ($running);

        foreach ($handles as $idx => $ch) {
            $response = curl_multi_getcontent($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            if ($response === false || $status < 200 || $status >= 300) {
                continue;
            }
            $data = json_decode($response);
            $total = isset($data->data->products->total_count)
                ? intval($data->data->products->total_count)
                : 0;
            if ($total > 0) {
                $tranche = self::TRANCHES_PRIX[$idx];
                $tranches[] = [
                    'prixMin' => $tranche['from'],
                    'prixMax' => $tranche['to'],
                    'total' => $total,
                ];
            }
        }
        curl_multi_close($mh);

        return $tranches;
    }

    private function typeParCategorie($type)
    {
        $types = [
            'rouge' => 'Vin rouge',
            'blanc' => 'Vin blanc',
            'rose' => 'Vin rosé',
        ];

        return $types[$type] ?? 'Vin rouge';
    }

    //IMPORTER DE LA SAQ
    public function ajouter($donneesSaq)
    {
        try {
            $body = json_decode($donneesSaq) ?: new stdClass();
            if (($body->mode ?? '') === 'cancel') {
                @file_put_contents(
                    sys_get_temp_dir() . '/monvino-saq-sync.cancel',
                    (string) time()
                );
                $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
                $this->reponse['corps'] = ['ok' => true];
                return;
            }
            if (($body->mode ?? '') === 'full') {
                $this->skipReponse = true;
                $this->synchronisationComplete();
                return;
            }
            $prixMin = isset($body->prixMin) ? (string) $body->prixMin : null;
            $prixMax = isset($body->prixMax) ? (string) $body->prixMax : null;
            $this->getProduits($body->nombre, $body->page + 0, $body->type, $prixMin, $prixMax);
            $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
            $this->reponse['corps'] = ['succes' => true];
        } catch (Throwable $e) {
            if ($this->skipReponse) {
                $this->emitNdjson([
                    'type' => 'error',
                    'erreur' => $e->getMessage(),
                ]);
                return;
            }
            $this->reponse['entete_statut'] = 'HTTP/1.1 500 Internal Server Error';
            $this->reponse['corps'] = ['erreur' => $e->getMessage()];
        }
    }

    /**
     * One-shot SAQ catalogue sync: parallel GraphQL fetches + bulk DB upsert.
     * Streams NDJSON progress lines (type=progress|done|error|cancelled).
     */
    private function synchronisationComplete()
    {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        // Apache php.ini defaults to 128M; parallel GraphQL pages + carte SAQ need more.
        @ini_set('memory_limit', '512M');
        ignore_user_abort(true);
        $cancelFile = sys_get_temp_dir() . '/monvino-saq-sync.cancel';
        @unlink($cancelFile);

        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        header('Content-Type: application/x-ndjson; charset=UTF-8');
        header('Cache-Control: no-cache, no-transform');
        header('X-Accel-Buffering: no');
        header('HTTP/1.1 200 OK');

        $pageSize = 100;
        $concurrency = 6;
        $types = ['rouge', 'blanc', 'rose'];
        $carteTypes = [];
        foreach (['Vin rouge', 'Vin blanc', 'Vin rosé'] as $typeNom) {
            $row = $this->modele->un($typeNom);
            if ($row && isset($row->id)) {
                $carteTypes[$typeNom] = (int) $row->id;
            }
        }

        $this->emitNdjson([
            'type' => 'progress',
            'phase' => 'plan',
            'message' => 'Préparation du plan SAQ…',
            'total' => 0,
            'done' => 0,
            'percent' => 0,
        ]);

        $this->modele->normaliserCodesSaqVides();
        $carteCodeSaq = $this->modele->carteCodeSaq();

        $jobs = [];
        $totalEstime = 0;
        $totauxParType = [];
        foreach ($types as $type) {
            $tranches = $this->tranchesPrixPourType($type);
            $typeTotal = 0;
            foreach ($tranches as $tranche) {
                $typeTotal += (int) $tranche['total'];
                $nbPages = (int) ceil($tranche['total'] / $pageSize);
                for ($page = 0; $page < $nbPages; $page++) {
                    $jobs[] = [
                        'type' => $type,
                        'page' => $page,
                        'pageSize' => $pageSize,
                        'prixMin' => $tranche['prixMin'],
                        'prixMax' => $tranche['prixMax'],
                    ];
                }
            }
            $label = $type === 'rose' ? 'rosé' : $type;
            $totauxParType[$label] = $typeTotal;
            $totalEstime += $typeTotal;
            $this->emitNdjson([
                'type' => 'progress',
                'phase' => 'plan',
                'vinType' => $label,
                'typeTotal' => $typeTotal,
                'total' => $totalEstime,
                'done' => 0,
                'percent' => 0,
                'message' => "Plan $label : $typeTotal bouteilles",
            ]);
        }

        if ($jobs === []) {
            $this->emitNdjson(['type' => 'done', 'total' => 0, 'inserts' => 0, 'updates' => 0]);
            return;
        }

        $this->emitNdjson([
            'type' => 'progress',
            'phase' => 'import',
            'message' => 'Import en cours…',
            'total' => $totalEstime,
            'done' => 0,
            'percent' => 0,
            'jobs' => count($jobs),
        ]);

        $done = 0;
        $inserts = 0;
        $updates = 0;
        $chunks = array_chunk($jobs, $concurrency);
        $chunkIndex = 0;

        foreach ($chunks as $chunk) {
            $chunkIndex++;
            if (is_file($cancelFile)) {
                @unlink($cancelFile);
                $this->emitNdjson([
                    'type' => 'cancelled',
                    'done' => $done,
                    'percent' => $totalEstime > 0
                        ? min(100, (int) floor(($done * 100) / $totalEstime))
                        : 0,
                ]);
                return;
            }

            try {
                $pages = $this->fetchProductsPagesParallel($chunk);
                $lot = [];
                foreach ($pages as $pageResult) {
                    $typeFallback = $this->typeParCategorie($pageResult['job']['type']);
                    $typeId = $carteTypes[$typeFallback] ?? null;
                    if ($typeId === null) {
                        continue;
                    }
                    $items = $pageResult['items'] ?? [];
                    foreach ($items as $item) {
                        if (!$item || !isset($item->sku)) {
                            continue;
                        }
                        $info = $this->productFromGraphQL($item);
                        $typeNom = $this->normaliserTypeVin(
                            $info->desc->type ?? $typeFallback
                        );
                        $resolvedTypeId = $carteTypes[$typeNom] ?? $typeId;
                        $lot[] = ['vin' => $info, 'type_id' => $resolvedTypeId];
                    }
                    $done += count($items);
                }
                unset($pages);

                if ($lot !== []) {
                    $stats = $this->modele->enTransaction(function () use ($lot, &$carteCodeSaq) {
                        return $this->modele->upsertLot($lot, $carteCodeSaq);
                    });
                    $inserts += $stats['inserts'];
                    $updates += $stats['updates'];
                }
                unset($lot);
            } catch (Throwable $e) {
                $this->emitNdjson([
                    'type' => 'error',
                    'erreur' => 'Chunk ' . $chunkIndex . ': ' . $e->getMessage(),
                    'done' => $done,
                    'percent' => $totalEstime > 0
                        ? min(100, (int) floor(($done * 100) / $totalEstime))
                        : 0,
                ]);
                return;
            }

            $percent = $totalEstime > 0
                ? min(99, (int) floor(($done * 100) / $totalEstime))
                : 99;
            $lastType = $chunk[count($chunk) - 1]['type'] ?? '';
            $label = $lastType === 'rose' ? 'rosé' : $lastType;
            $this->emitNdjson([
                'type' => 'progress',
                'phase' => 'import',
                'vinType' => $label,
                'total' => $totalEstime,
                'done' => $done,
                'percent' => max(1, $percent),
                'inserts' => $inserts,
                'updates' => $updates,
                'message' => "$done / $totalEstime ($label)",
            ]);
        }

        $this->emitNdjson([
            'type' => 'done',
            'total' => $totalEstime,
            'done' => $done,
            'inserts' => $inserts,
            'updates' => $updates,
            'percent' => 100,
            'totauxParType' => $totauxParType,
        ]);
    }

    private function emitNdjson(array $payload)
    {
        echo json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n";
        if (function_exists('ob_flush')) {
            @ob_flush();
        }
        flush();
    }

    /**
     * @param array<int,array{type:string,page:int,pageSize:int,prixMin:?string,prixMax:?string}> $jobs
     * @return array<int,array{job:array,items:array}>
     */
    private function fetchProductsPagesParallel(array $jobs)
    {
        if (!function_exists('curl_multi_init')) {
            $out = [];
            foreach ($jobs as $job) {
                $products = $this->fetchProductsPage(
                    $job['type'],
                    $job['page'] + 1,
                    $job['pageSize'],
                    true,
                    $job['prixMin'],
                    $job['prixMax']
                );
                $out[] = [
                    'job' => $job,
                    'items' => isset($products->items) ? $products->items : [],
                ];
            }
            return $out;
        }

        $mh = curl_multi_init();
        $handles = [];
        foreach ($jobs as $idx => $job) {
            $categoryPath = $this->categoryPathForType($job['type']);
            $itemsSelection = 'items {
                sku name url_key
                price_range { minimum_price { final_price { value } } }
                small_image { url }
                custom_attributesV2 {
                    items {
                        code
                        ... on AttributeValue { value }
                        ... on AttributeSelectedOptions { selected_options { label } }
                    }
                }
            }';
            $query = '{ products(filter: { category_url_path: { eq: "' . $categoryPath . '" }'
                . $this->prixFilterGraphQL($job['prixMin'], $job['prixMax'])
                . ' }, pageSize: ' . intval($job['pageSize'])
                . ', currentPage: ' . intval($job['page'] + 1)
                . ') { total_count ' . $itemsSelection . ' } }';
            $query = preg_replace('/\s+/', ' ', trim($query));
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => self::SAQ_GRAPHQL_URL,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode(['query' => $query]),
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
                CURLOPT_TIMEOUT => 90,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$idx] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running) {
                curl_multi_select($mh, 1.0);
            }
        } while ($running);

        $out = [];
        foreach ($handles as $idx => $ch) {
            $response = curl_multi_getcontent($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            $items = [];
            if ($response !== false && $status >= 200 && $status < 300) {
                $data = json_decode($response);
                unset($response);
                $items = $data->data->products->items ?? [];
                unset($data);
            } else {
                unset($response);
            }
            $out[] = ['job' => $jobs[$idx], 'items' => $items];
        }
        unset($handles);
        curl_multi_close($mh);
        return $out;
    }

    /**
     * Importer les bouteilles d'une page via l'API GraphQL de la SAQ.
     */
    public function getProduits($nombre, $page, $type = "rouge", $prixMin = null, $prixMax = null)
    {
        $products = $this->fetchProductsPage($type, $page + 1, $nombre, true, $prixMin, $prixMax);
        if (!$products || !isset($products->items)) {
            return 0;
        }

        $typeFallback = $this->typeParCategorie($type);
        return $this->modele->enTransaction(function () use ($products, $typeFallback) {
            $i = 0;
            foreach ($products->items as $item) {
                if (!$item || !isset($item->sku)) {
                    continue;
                }

                $info = $this->productFromGraphQL($item);
                $retour = $this->ajouteProduit($info, $typeFallback);
                if ($retour->succes) {
                    $i++;
                }
            }
            return $i;
        });
    }

    /**
     * Ajouter les bouteilles importées dans la base de donnée
     */
    private function normaliserTypeVin($type)
    {
        $aliases = [
            'Vin rose' => 'Vin rosé',
        ];

        return $aliases[$type] ?? $type;
    }

    private function ajouteProduit($bte, $typeFallback = null)
    {
        $retour = new stdClass();
        $retour->succes = false;
        $retour->raison = '';

        $typeNom = $this->normaliserTypeVin($bte->desc->type ?? $typeFallback ?? '');
        if ($typeNom === '') {
            $retour->raison = self::ERREURDB;
            return $retour;
        }

        $rows = $this->modele->un($typeNom);
        if (!$rows || !isset($rows->id)) {
            $retour->raison = self::ERREURDB;
            return $retour;
        }

        $type_id = $rows->id;
        $existant = $this->modele->un($bte->desc->code_SAQ);
        if ($existant === false) {
            try {
                $this->modele->ajouter($bte, $type_id);
                $retour->succes = true;
                $retour->raison = self::INSERE;
            } catch (Throwable $e) {
                $retour->raison = $e->getMessage();
            }
        } else {
            try {
                $this->modele->mettreAJourParCodeSaq($bte, $type_id);
                $retour->succes = true;
                $retour->raison = self::DUPLICATION;
            } catch (Throwable $e) {
                $retour->raison = $e->getMessage();
            }
        }

        return $retour;
    }

    /**
     * Récupérer le nombre de bouteilles par type de vin - Méthod 'GET'
     */
    public function tout($type)
    {
        try {
            $wineType = $type["admin"];
            $products = $this->fetchProductsPage($wineType, 1, 1, false);
            $nbResults = isset($products->total_count) ? intval($products->total_count) : 0;
            $tranches = $this->tranchesPrixPourType($wineType);
            $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
            $this->reponse['corps'] = [
                'total' => $nbResults,
                'tranches' => $tranches,
            ];
        } catch (Throwable $e) {
            $this->reponse['entete_statut'] = 'HTTP/1.1 500 Internal Server Error';
            $this->reponse['corps'] = ['erreur' => $e->getMessage()];
        }
    }

    public function un($params, $idEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = $this->modele->un($params, $idEntite);
    }

    public function remplacer($id, $cellier)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = $this->modele->remplacer($id, json_decode($cellier));
    }

    public function changer($params, $idEntite, $fragmentEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = $this->modele->changer($params, $idEntite, json_decode($fragmentEntite));
    }

    public function retirer($params, $idEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = ['nombre' => $this->modele->retirer($params, $idEntite)];
    }
}
