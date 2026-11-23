<?php
class SaqModele extends AccesBd
{
    /**
     * Récupérer tous les bouteilles importées de la SAQ qui se trouve dans le cellier numéro 1 réservé pour l'administrateur
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @return array Tableau associatif contenant des tableaux des données
     */
    public function tout($params)
    {
        return $this->lire("SELECT  vino__cellier.vino__utilisateur_id, vino__bouteille.id, vino__bouteille.nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, vino__type.type, millesime,personnalise, vino__cellier_id, quantite, date_achat, garde_jusqua, notes FROM vino__bouteille JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id=vino__bouteille_has_vino__cellier.vino__bouteille_id JOIN vino__type ON vino__bouteille.vino__type_id=vino__type.id JOIN vino__cellier ON vino__cellier.id =vino__bouteille_has_vino__cellier.vino__cellier_id where vino__bouteille_has_vino__cellier.vino__cellier_id =:cellier ORDER BY vino__bouteille.id ASC", ['cellier' => $params['cellier']]);
    }

    /**
     * Récupérer l'id d'une bouteille spécifié par son code_saq ou bien l'id du type selon le nom du type de la bouteille 
     *
     * @param  array $bte Tableau associatif des paramètres de la requête
     * @return int L'identifiant de l'enregistrement
     */
    public function un($bte)
    {
        if ($bte === "Vin rouge" || $bte === "Vin blanc" || $bte === "Vin rosé" || $bte === "Vin rose") {
            if ($bte === "Vin rose") {
                $bte = "Vin rosé";
            }
            return $this->lireUn("select id from vino__type where type = :bte", ['bte' => $bte]);
        } else {
            return $this->lireUn("select id from vino__bouteille where code_saq = :bte", ['bte' => $bte]);
        }
    }
    
    /**
     * Ajouter(Importer) une nouvelle bouteille de la SAQ dans la bd
     *
     * @param  mixed $vin 
     * @param  mixed $type_id
     * @return void
     */
    public function ajouter($vin, $type_id)
    {
        $millesime = $this->millesimeDepuisProduit($vin);
        $nouveau_id = $this->creer(
            "INSERT INTO vino__bouteille (nom, vino__type_id, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, millesime, personnalise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $vin->nom,
                $type_id,
                $vin->img,
                $vin->desc->code_SAQ,
                $vin->desc->pays,
                $vin->desc->texte,
                floatval($vin->prix),
                $vin->url,
                $vin->img,
                $vin->desc->format,
                $millesime,
                0,
            ]
        );
        return $this->creer(
            "INSERT INTO `vino__bouteille_has_vino__cellier` (`vino__bouteille_id`, `vino__cellier_id`, `quantite`, `date_achat`, `garde_jusqua`, `notes`) VALUES (?, ?, ?, ?, ?, ?)",
            [$nouveau_id, 1, 1, "2000-01-01", "2023", "Vin de la SAQ"]
        );
    }

    /**
     * Refresh catalogue fields for an existing SAQ product (same code_saq).
     */
    public function mettreAJourParCodeSaq($vin, $type_id)
    {
        $millesime = $this->millesimeDepuisProduit($vin);
        return $this->modifier(
            "UPDATE vino__bouteille SET nom=?, vino__type_id=?, `image`=?, pays=?, `description`=?, prix_saq=?, url_saq=?, url_img=?, `format`=?, millesime=? WHERE code_saq=?",
            [
                $vin->nom,
                $type_id,
                $vin->img,
                $vin->desc->pays,
                $vin->desc->texte,
                floatval($vin->prix),
                $vin->url,
                $vin->img,
                $vin->desc->format,
                $millesime,
                $vin->desc->code_SAQ,
            ]
        );
    }

    private function millesimeDepuisProduit($vin)
    {
        $m = $vin->desc->millesime ?? null;
        if ($m !== null && (int) $m >= 1900 && (int) $m <= 2100) {
            return (int) $m;
        }
        return null;
    }

    /**
     * @return array<string,int> code_saq => id
     */
    public function carteCodeSaq()
    {
        $rows = $this->lire(
            "SELECT id, code_saq FROM vino__bouteille
             WHERE code_saq IS NOT NULL AND code_saq != ''"
        );
        $map = [];
        if (!is_array($rows)) {
            return $map;
        }
        foreach ($rows as $row) {
            $map[(string) $row->code_saq] = (int) $row->id;
        }
        return $map;
    }

    /**
     * Bulk insert/update SAQ products. Mutates $carteCodeSaq with new ids.
     *
     * @param array<int,array{vin:object,type_id:int}> $lot
     * @param array<string,int> $carteCodeSaq
     * @return array{inserts:int,updates:int}
     */
    public function upsertLot(array $lot, array &$carteCodeSaq)
    {
        if ($lot === []) {
            return ['inserts' => 0, 'updates' => 0];
        }

        $aInserer = [];
        $aMaj = [];
        foreach ($lot as $item) {
            $vin = $item['vin'];
            $code = (string) ($vin->desc->code_SAQ ?? '');
            if ($code === '') {
                continue;
            }
            if (isset($carteCodeSaq[$code])) {
                $aMaj[] = $item;
            } else {
                $aInserer[] = $item;
            }
        }

        $inserts = 0;
        $updates = 0;

        if ($aMaj !== []) {
            $sql = "UPDATE vino__bouteille
                    SET nom=?, vino__type_id=?, `image`=?, pays=?, `description`=?,
                        prix_saq=?, url_saq=?, url_img=?, `format`=?, millesime=?
                    WHERE code_saq=?";
            $stmt = $this->pdo()->prepare($sql);
            foreach ($aMaj as $item) {
                $vin = $item['vin'];
                $stmt->execute([
                    $vin->nom,
                    $item['type_id'],
                    $vin->img,
                    $vin->desc->pays,
                    $vin->desc->texte,
                    floatval($vin->prix),
                    $vin->url,
                    $vin->img,
                    $vin->desc->format,
                    $this->millesimeDepuisProduit($vin),
                    $vin->desc->code_SAQ,
                ]);
                $updates++;
            }
        }

        if ($aInserer !== []) {
            $chunkSize = 40;
            foreach (array_chunk($aInserer, $chunkSize) as $chunk) {
                $placeholders = [];
                $params = [];
                foreach ($chunk as $item) {
                    $vin = $item['vin'];
                    $placeholders[] = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)';
                    array_push(
                        $params,
                        $vin->nom,
                        $item['type_id'],
                        $vin->img,
                        $vin->desc->code_SAQ,
                        $vin->desc->pays,
                        $vin->desc->texte,
                        floatval($vin->prix),
                        $vin->url,
                        $vin->img,
                        $vin->desc->format,
                        $this->millesimeDepuisProduit($vin)
                    );
                }
                $sql = "INSERT INTO vino__bouteille
                    (nom, vino__type_id, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, millesime, personnalise)
                    VALUES " . implode(', ', $placeholders);
                $this->pdo()->prepare($sql)->execute($params);

                $codes = array_map(
                    function ($item) {
                        return (string) $item['vin']->desc->code_SAQ;
                    },
                    $chunk
                );
                $in = implode(',', array_fill(0, count($codes), '?'));
                $rows = $this->lire(
                    "SELECT id, code_saq FROM vino__bouteille WHERE code_saq IN ($in)",
                    $codes
                );
                $nouveauxIds = [];
                foreach ($rows as $row) {
                    $carteCodeSaq[(string) $row->code_saq] = (int) $row->id;
                    $nouveauxIds[] = (int) $row->id;
                }
                if ($nouveauxIds !== []) {
                    $linkPlaceholders = [];
                    $linkParams = [];
                    foreach ($nouveauxIds as $id) {
                        $linkPlaceholders[] = '(?, 1, 1, ?, ?, ?)';
                        array_push(
                            $linkParams,
                            $id,
                            '2000-01-01',
                            '2023',
                            'Vin de la SAQ'
                        );
                    }
                    $linkSql = "INSERT IGNORE INTO vino__bouteille_has_vino__cellier
                        (vino__bouteille_id, vino__cellier_id, quantite, date_achat, garde_jusqua, notes)
                        VALUES " . implode(', ', $linkPlaceholders);
                    $this->pdo()->prepare($linkSql)->execute($linkParams);
                }
                $inserts += count($chunk);
            }
        }

        return ['inserts' => $inserts, 'updates' => $updates];
    }

    /**
     * Ensure empty SAQ codes are NULL so a unique index can be added safely.
     */
    public function normaliserCodesSaqVides()
    {
        $this->modifier(
            "UPDATE vino__bouteille SET code_saq = NULL WHERE code_saq = ''"
        );
    }
    
    /**
     * Supprimer une bouteille spécifié par son id
     *
     * @param  array $id
     * @return void
     */
    public function retirer($id)
    {
        $this->supprimer("DELETE FROM vino__bouteille_has_vino__cellier WHERE vino__bouteille_has_vino__cellier.	
        vino__bouteille_id=:vin_id", ['vin_id' => $id]);
        return $this->supprimer("DELETE FROM vino__bouteille WHERE vino__bouteille.id=:vin_id", ['vin_id' => $id]);
    }

    /**
     * Non appliqué
     *
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
     * Non appliqué
     *
     */
    public function changer($params, $idEntite, $fragmentVin)
    {
        $this->modifier("UPDATE vino__bouteille_has_vino__cellier SET 	
        quantite=:fragment_vin , date_achat=:fragment_dateAchat, garde_jusqua=:fragment_dateGarde WHERE vino__bouteille_id=:vin_id AND vino__cellier_id=:cellier_id",  ['cellier_id' => $params["cellier"], 'vin_id' => $idEntite["bouteille"], 'fragment_vin' => $fragmentVin->quantite, 'fragment_dateAchat' => $fragmentVin->date_achat, 'fragment_dateGarde' => $fragmentVin->garde_jusqua]);
    }
}