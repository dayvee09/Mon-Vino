<?php
class FavorisModele extends AccesBd
{    
    /**
     * Récupérer toutes les bouteilles favories à un utilisateur connecté
     *
     * @param  array $params Tableau associatif des paramètres de la requête
     * @return array Tableau associatif contenant des tableaux des données
     */
    public function tout($params)
    {
        if (isset($params['utilisateur'])) {
            // Restrict cellar join to this user's cellars so the SAQ catalogue
            // (19k+ rows in cellier #1) does not inflate the favorites query.
            return $this->lire(
                "SELECT
                    vino__favoris.vino__bouteille_id,
                    vino__bouteille.id,
                    vino__bouteille.nom,
                    vino__bouteille.`image`,
                    vino__bouteille.code_saq,
                    vino__bouteille.pays,
                    vino__bouteille.`description`,
                    vino__bouteille.prix_saq,
                    vino__bouteille.url_saq,
                    vino__bouteille.url_img,
                    vino__bouteille.`format`,
                    vino__bouteille.vino__type_id,
                    vino__type.type,
                    vino__bouteille.millesime,
                    vino__bouteille.personnalise,
                    MIN(lien.vino__cellier_id) AS vino__cellier_id,
                    MAX(lien.quantite) AS quantite,
                    MAX(lien.date_achat) AS date_achat,
                    MAX(lien.garde_jusqua) AS garde_jusqua,
                    MAX(lien.notes) AS notes
                 FROM vino__favoris
                 JOIN vino__bouteille
                   ON vino__favoris.vino__bouteille_id = vino__bouteille.id
                 JOIN vino__type
                   ON vino__bouteille.vino__type_id = vino__type.id
                 LEFT JOIN vino__bouteille_has_vino__cellier AS lien
                   ON lien.vino__bouteille_id = vino__bouteille.id
                 LEFT JOIN vino__cellier
                   ON vino__cellier.id = lien.vino__cellier_id
                  AND vino__cellier.vino__utilisateur_id = :utilisateur
                 WHERE vino__favoris.vino__utilisateur_id = :utilisateur
                   AND (lien.vino__bouteille_id IS NULL OR vino__cellier.id IS NOT NULL)
                 GROUP BY vino__favoris.vino__bouteille_id
                 ORDER BY vino__bouteille.nom ASC",
                ['utilisateur' => $params['utilisateur']]
            );
        } else if (isset($params['utilisateurId'])) {
            return $this->lire(
                "SELECT vino__favoris.vino__bouteille_id
                 FROM vino__favoris
                 WHERE vino__favoris.vino__utilisateur_id = :utilisateurId",
                ['utilisateurId' => $params['utilisateurId']]
            );
        }
    }
    
    /**
     * Non appliqué
     *
     */
    public function un($params, $idEntite)
    {
        $id_vin = intval($idEntite['vins']);
        $id_cellier = intval($idEntite['celliers']);
        return $this->lireUn("SELECT nom, `image`, code_saq, pays, `description`, prix_saq, url_saq, url_img, `format`, vino__type_id, millesime,personnalise, vino__cellier_id, quantite, date_achat, garde_jusqua, notes FROM vino__bouteille JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id=vino__bouteille_has_vino__cellier.vino__bouteille_id WHERE vino__bouteille.id=:vin_id and vino__bouteille_has_vino__cellier.vino__cellier_id=:cellier_id", ['vin_id' => $id_vin, 'cellier_id' => $id_cellier]);
    }
    
    /**
     * Ajouter une bouteille favorie à un utilisateur connecté
     *
     * @param  mixed $vin Payload du corps du message HTTP en format JSON
     * @return int Identifiant (auto increment) du dernier enregistrement inséré
     */
    public function ajouter($vin)
    {
        return $this->creer("INSERT INTO vino__favoris (vino__bouteille_id, vino__utilisateur_id) VALUES (?, ?)", [$vin->vino__bouteille_id, $vin->vino__utilisateur_id]);
    }
    
    /**
     * Supprimer une bouteille favorie
     *
     * @param  array $utilisateur Tableau associatif des paramètres de la requête
     * @param  array $vin Tableau associatif des paramètres de la requête
     * @return int Nombre d'enregistrement affecté
     */
    public function retirer($utilisateur, $vin)
    {
        return $this->supprimer("DELETE FROM vino__favoris WHERE vino__bouteille_id=:vin AND vino__utilisateur_id=:utilisateur", ['vin' => $vin["vin"], 'utilisateur' => $utilisateur["utilisateur"]]);
    }
    
    /**
     * Non appliqué
     *
     */
    public function remplacer($id, $vin)
    {
        $id_vin = intval($id['vins']);
        $id_cellier = intval($id['celliers']);
        return  $this->modifier("UPDATE vino__bouteille_has_vino__cellier SET 	
      quantite=?, date_achat=?, garde_jusqua=?, notes=? WHERE vino__bouteille_id=? and vino__cellier_id=?", [
            $vin->quantite,
            $vin->date_achat,
            $vin->garde_jusqua,
            $vin->notes,
            $id_vin,
            $id_cellier
        ]);
    }
}