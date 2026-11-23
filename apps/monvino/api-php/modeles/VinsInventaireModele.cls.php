<?php
class VinsInventaireModele extends AccesBd
{
    /**
     * Récupérer les inventaires de toutes les bouteilles à un utilisteur connecté
     * URL : http://localhost/PW2/cellier-projet/api-php/user_id/2/vinsInventaire/
     * @param  array $params Tableau associatif des paramètres de la requête
     * @return array tableau associatif contenant l'ensemble de toute les bouteilles à un utilisateur connecté
     */
    public function tout($params)
    {
        return $this->lire(
            "SELECT vino__bouteille.id, vino__bouteille.nom, `image`, code_saq, pays, prix_saq, `format`,
                    vino__type_id, vino__type.type, millesime, personnalise,
                    SumQuantiteParBouteille.quantite_total,
                    SumQuantiteParBouteille.quantite_total * prix_saq AS prix_total
             FROM vino__bouteille
             JOIN vino__type ON vino__bouteille.vino__type_id = vino__type.id
             JOIN (
                SELECT link.vino__bouteille_id AS bouteille_id, SUM(link.quantite) AS quantite_total
                FROM vino__bouteille_has_vino__cellier link
                JOIN vino__cellier c ON c.id = link.vino__cellier_id
                WHERE c.vino__utilisateur_id = :user_id AND c.id != 1
                GROUP BY link.vino__bouteille_id
                HAVING quantite_total > 0
             ) SumQuantiteParBouteille
               ON SumQuantiteParBouteille.bouteille_id = vino__bouteille.id
             ORDER BY vino__bouteille.id",
            ['user_id' => $params['user_id']]
        );
    }

    /**
     * Celliers (stocks) pour une bouteille — requête légère pour le tiroir.
     * URL : …/user_id/{uid}/vinsInventaire/vin_id/{id}
     */
    public function un($params, $idEntite)
    {
        return $this->lire(
            "SELECT b.id, b.nom, b.image, b.code_saq, b.pays, b.prix_saq, b.format,
                    b.vino__type_id, t.type, b.millesime, b.personnalise,
                    c.id AS cellier_id, c.nom AS cellier_nom, link.quantite,
                    (
                      SELECT SUM(l2.quantite)
                      FROM vino__bouteille_has_vino__cellier l2
                      JOIN vino__cellier c2 ON c2.id = l2.vino__cellier_id
                      WHERE l2.vino__bouteille_id = :vin_id
                        AND c2.vino__utilisateur_id = :user_id
                        AND c2.id != 1
                    ) AS quantite_total
             FROM vino__bouteille_has_vino__cellier link
             JOIN vino__cellier c ON c.id = link.vino__cellier_id
             JOIN vino__bouteille b ON b.id = link.vino__bouteille_id
             JOIN vino__type t ON t.id = b.vino__type_id
             WHERE c.vino__utilisateur_id = :user_id
               AND link.vino__bouteille_id = :vin_id
               AND c.id != 1
               AND link.quantite > 0
             ORDER BY c.nom ASC",
            [
                'vin_id' => $idEntite['vin_id'],
                'user_id' => $params['user_id'],
            ]
        );
    }
}
