<?php
class VinsModele extends AccesBd
{
    private const LIST_SELECT = "SELECT vino__cellier.vino__utilisateur_id, vino__bouteille.id, vino__bouteille.nom, `image`, code_saq, pays, prix_saq, `format`, vino__type_id, vino__type.type, millesime, personnalise, vino__cellier_id, quantite, date_achat, garde_jusqua, notes FROM vino__bouteille JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id=vino__bouteille_has_vino__cellier.vino__bouteille_id JOIN vino__type ON vino__bouteille.vino__type_id=vino__type.id JOIN vino__cellier ON vino__cellier.id =vino__bouteille_has_vino__cellier.vino__cellier_id WHERE vino__bouteille_has_vino__cellier.vino__cellier_id =:cellier ORDER BY vino__bouteille.id ASC";

    /**
     * Récupérer toutes les bouteilles dans un cellier spécifié
     * Optional pagination via $params['limit'] / $params['offset'].
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @return array Tableau associatif contenant des tableaux des données
     */
    public function tout($params)
    {
        $sql = self::LIST_SELECT;
        $bind = ['cellier' => $params['cellier']];

        if (isset($params['limit']) && $params['limit'] !== '' && $params['limit'] !== null) {
            $limit = max(1, min((int) $params['limit'], 500));
            $offset = max(0, (int) ($params['offset'] ?? 0));
            $sql .= " LIMIT {$limit} OFFSET {$offset}";
        }

        return $this->lire($sql, $bind);
    }

    /**
     * Nombre de bouteilles dans un cellier (pour pagination).
     */
    public function compter($params)
    {
        $row = $this->lireUn(
            "SELECT COUNT(*) AS total
             FROM vino__bouteille_has_vino__cellier
             WHERE vino__cellier_id = :cellier",
            ['cellier' => $params['cellier']]
        );
        return (int) ($row->total ?? 0);
    }

    /**
     * Recherche dans le catalogue SAQ (cellier admin #1) pour l'autocomplete.
     * Prefers FULLTEXT on nom; falls back to LIKE. code_saq uses prefix/equality.
     */
    public function rechercherCatalogueSaq($terme, $limite = 50)
    {
        $limite = max(1, min((int) $limite, 100));
        $terme = trim((string) $terme);
        $millesime = null;
        $termeNom = $terme;
        if (preg_match('/\b((?:19|20)\d{2})\b/', $terme, $m)) {
            $millesime = (int) $m[1];
            $termeNom = trim(preg_replace('/\b(?:19|20)\d{2}\b/', '', $terme));
        }
        if ($termeNom === '') {
            $termeNom = $terme;
        }

        $fetchLimit = min(400, max(80, $limite * 8));
        $millSql = '';
        $params = [];
        if ($millesime !== null) {
            $millSql = ' AND vino__bouteille.millesime = :millesime ';
            $params['millesime'] = $millesime;
        }

        $rows = $this->rechercherCatalogueSaqFulltext($termeNom, $fetchLimit, $millSql, $params);
        if ($rows === null || $rows === []) {
            $rows = $this->rechercherCatalogueSaqLike($termeNom, $fetchLimit, $millSql, $params);
        }

        if (!is_array($rows) || $rows === []) {
            return [];
        }

        if ($millesime !== null) {
            return array_slice($rows, 0, $limite);
        }

        $bestByKey = [];
        foreach ($rows as $row) {
            $key = mb_strtolower(trim((string) ($row->nom ?? '')))
                . '|'
                . mb_strtolower(trim((string) ($row->format ?? '')));
            if ($key === '|') {
                continue;
            }
            if (!isset($bestByKey[$key]) || $this->catalogueSaqPlusRecent($row, $bestByKey[$key])) {
                $bestByKey[$key] = $row;
            }
        }

        $out = array_values($bestByKey);
        usort($out, function ($a, $b) {
            $byName = strcasecmp((string) ($a->nom ?? ''), (string) ($b->nom ?? ''));
            if ($byName !== 0) {
                return $byName;
            }
            return strcasecmp((string) ($a->format ?? ''), (string) ($b->format ?? ''));
        });

        return array_slice($out, 0, $limite);
    }

    private function rechercherCatalogueSaqFulltext($termeNom, $fetchLimit, $millSql, $params)
    {
        $boolean = $this->termeVersBooleanFulltext($termeNom);
        if ($boolean === '') {
            return null;
        }

        $bind = array_merge($params, [
            'ft' => $boolean,
            'code_prefix' => $termeNom . '%',
            'code_exact' => $termeNom,
        ]);

        try {
            return $this->lire(
                "SELECT vino__bouteille.id, vino__bouteille.nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, vino__type.type, millesime, personnalise
                FROM vino__bouteille
                JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id = vino__bouteille_has_vino__cellier.vino__bouteille_id
                JOIN vino__type ON vino__bouteille.vino__type_id = vino__type.id
                WHERE vino__bouteille_has_vino__cellier.vino__cellier_id = 1
                  AND vino__bouteille.personnalise = 0
                  AND (
                    MATCH(vino__bouteille.nom) AGAINST (:ft IN BOOLEAN MODE)
                    OR vino__bouteille.code_saq = :code_exact
                    OR vino__bouteille.code_saq LIKE :code_prefix
                  )
                  $millSql
                ORDER BY vino__bouteille.nom ASC, CAST(vino__bouteille.code_saq AS UNSIGNED) DESC
                LIMIT $fetchLimit",
                $bind
            );
        } catch (Throwable $e) {
            // Index missing or FULLTEXT unavailable — caller falls back to LIKE.
            return null;
        }
    }

    private function rechercherCatalogueSaqLike($termeNom, $fetchLimit, $millSql, $params)
    {
        $like = '%' . $termeNom . '%';
        $bind = array_merge($params, ['q' => $like]);

        return $this->lire(
            "SELECT vino__bouteille.id, vino__bouteille.nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, vino__type.type, millesime, personnalise
            FROM vino__bouteille
            JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id = vino__bouteille_has_vino__cellier.vino__bouteille_id
            JOIN vino__type ON vino__bouteille.vino__type_id = vino__type.id
            WHERE vino__bouteille_has_vino__cellier.vino__cellier_id = 1
              AND vino__bouteille.personnalise = 0
              AND (vino__bouteille.nom LIKE :q OR vino__bouteille.code_saq LIKE :q)
              $millSql
            ORDER BY vino__bouteille.nom ASC, CAST(vino__bouteille.code_saq AS UNSIGNED) DESC
            LIMIT $fetchLimit",
            $bind
        );
    }

    /**
     * Build InnoDB BOOLEAN MODE query: +token* for each alphanumeric token.
     */
    private function termeVersBooleanFulltext($terme)
    {
        $terme = trim((string) $terme);
        if ($terme === '') {
            return '';
        }
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $terme, -1, PREG_SPLIT_NO_EMPTY);
        if (!$parts) {
            return '';
        }
        $tokens = [];
        foreach ($parts as $part) {
            if (mb_strlen($part) < 2) {
                continue;
            }
            $safe = preg_replace('/[+\-><()~*\"@]+/', '', $part);
            if ($safe === '' || mb_strlen($safe) < 2) {
                continue;
            }
            $tokens[] = '+' . $safe . '*';
        }
        return implode(' ', $tokens);
    }

    private function catalogueSaqPlusRecent($candidat, $actuel)
    {
        $score = function ($row) {
            $mill = (int) ($row->millesime ?? 0);
            if ($mill === 2000) {
                $mill = 0;
            }
            $code = (int) preg_replace('/\D+/', '', (string) ($row->code_saq ?? '0'));
            return [$mill, $code, (int) ($row->id ?? 0)];
        };

        return $score($candidat) > $score($actuel);
    }

    /**
     * Récupérer une bouteille spécifié dans un cellier spécifié
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @param  array $idEntite Tableau associatif des paramètres de la requête
     * @return array Tableau associatif ayant seulement un entregistrement cherché
     */
    public function un($params, $idEntite)
    {
        return $this->lireUn("SELECT nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, millesime,personnalise, vino__cellier_id, quantite, date_achat, garde_jusqua, notes FROM vino__bouteille JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id=vino__bouteille_has_vino__cellier.vino__bouteille_id WHERE vino__cellier_id = :cellier_id AND vino__bouteille_has_vino__cellier.vino__bouteille_id = :vin_id", ['vin_id' => $idEntite["bouteille"], 'cellier_id' => $params["cellier"]]);
    }

    /**
     * Ajouter une nouvelle bouteille soit importer soit créer (non listée)
     *
     * @param  mixed $vin Payload du corps du message HTTP en format JSON
     * @return int Identifiant (auto increment) du dernier enregistrement inséré
     */
    public function ajouter($vin)
    {
        if ($vin->personnalise == 1) {
            $nouveau_id = $this->creer("INSERT INTO vino__bouteille (nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, millesime,personnalise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [$vin->nom, $vin->image, $vin->code_saq, $vin->pays, $vin->description, $vin->prix_saq, $vin->url_saq, $vin->url_img, $vin->format, $vin->vino__type_id, $vin->millesime, $vin->personnalise]);
            $this->creer("INSERT INTO `vino__bouteille_has_vino__cellier` (`vino__bouteille_id`, `vino__cellier_id`, `quantite`, `date_achat`, `garde_jusqua`, `notes`) VALUES
            (?, ?, ?, ?, ?, ?)", [$nouveau_id, $vin->vino__cellier_id, $vin->quantite, $vin->date_achat, $vin->garde_jusqua, $vin->notes]);
            return $nouveau_id;
        }

        $this->creer("INSERT INTO `vino__bouteille_has_vino__cellier` (`vino__bouteille_id`, `vino__cellier_id`, `quantite`, `date_achat`, `garde_jusqua`, `notes`) VALUES
        (?, ?, ?, ?, ?, ?)", [$vin->vino__bouteille_id, $vin->vino__cellier_id, $vin->quantite, $vin->date_achat, $vin->garde_jusqua, $vin->notes]);
        // Link table has no auto-increment — return the bottle id for the client.
        return (int) $vin->vino__bouteille_id;
    }

    /**
     * supprimer une bouteille spécifié dans un cellier spécifié
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @param  array $idEntite $Tableau associatif des paramètres de la requête
     * @return int Nombre d'enregistrement affecté
     */
    public function retirer($params, $idEntite)
    {
        return $this->supprimer("DELETE FROM vino__bouteille_has_vino__cellier WHERE vino__bouteille_has_vino__cellier.	
        vino__bouteille_id=:vin_id AND vino__bouteille_has_vino__cellier.	
        vino__cellier_id=:cellier_id", ['vin_id' => $params["supprimer"], 'cellier_id' => $idEntite["cellier"]]);
    }

    /**
     * Modifier tous les champs d'un enregistrement
     *
     * @param  int $id L'identifant de la bouteille spécifié
     * @param  mixed $vin Payload du corps du message HTTP en format JSON
     * @return int Nombre d'enregistrement affecté
     */
    public function remplacer($id, $vin)
    {
        $this->modifier("UPDATE vino__bouteille_has_vino__cellier SET 	
        quantite=?, date_achat=?, garde_jusqua=?, notes=? WHERE vino__bouteille_id=?", [
            $vin->quantite,
            $vin->date_achat,
            $vin->garde_jusqua,
            $vin->notes,
            $id
        ]);
        return $this->modifier("UPDATE vino__bouteille SET nom=?, `image`=?, code_saq=?, pays=?, `description`=?, prix_saq=?,url_saq=?,url_img=?, `format`=?, millesime=?, personnalise=? WHERE id=?", [
            $vin->nom,
            $vin->image,
            $vin->code_saq,
            $vin->pays,
            $vin->description,
            $vin->prix_saq,
            $vin->url_saq,
            $vin->url_img,
            $vin->format,
            $vin->millesime,
            $vin->personnalise,
            $id
        ]);
    }

    /**
     * Modifier certains des champs d'une bouteille spécifié
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @param  array $idEntite Tableau associatif des paramètres de la requête
     * @param  mixed $fragmentVin Payload du corps du message HTTP en format JSON
     * @return void
     */
    public function changer($params, $idEntite, $fragmentVin)
    {
        $this->modifier("UPDATE vino__bouteille_has_vino__cellier SET 	
        quantite=:fragment_vin , date_achat=:fragment_dateAchat, garde_jusqua=:fragment_dateGarde, notes=:fragment_note WHERE vino__bouteille_id=:vin_id AND vino__cellier_id=:cellier_id",  ['cellier_id' => $params["cellier"], 'vin_id' => $idEntite["bouteille"], 'fragment_vin' => $fragmentVin->quantite, 'fragment_dateAchat' => $fragmentVin->date_achat, 'fragment_dateGarde' => $fragmentVin->garde_jusqua, 'fragment_note' => $fragmentVin->note]);
    }
}
