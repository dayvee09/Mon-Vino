<?php
/**
 * Bootstrap payload: utilisateur + celliers + stats in one round-trip.
 */
class MeModele extends AccesBd
{
    /**
     * @param array $params expects 'email'
     * @return object|false
     */
    public function bootstrap($params)
    {
        $email = isset($params['email']) ? trim((string) $params['email']) : '';
        if ($email === '') {
            return false;
        }

        $utilisateur = $this->lireUn(
            "SELECT id, email, nom, privilege FROM vino__utilisateur WHERE email = :email",
            ['email' => $email]
        );
        if (!is_object($utilisateur) || empty($utilisateur->id)) {
            return false;
        }

        $userId = (int) $utilisateur->id;

        $celliers = $this->lire(
            "SELECT vino__cellier.id, vino__cellier.nom, vino__utilisateur_id
             FROM vino__cellier
             JOIN vino__utilisateur ON vino__utilisateur.id = vino__cellier.vino__utilisateur_id
             WHERE vino__cellier.vino__utilisateur_id = :user_id",
            ['user_id' => $userId]
        );

        $stats = $this->lire(
            "SELECT vino__bouteille_has_vino__cellier.vino__cellier_id AS cellier_id,
                    count(*) AS compte,
                    sum(prix_saq * quantite) AS somme
             FROM vino__bouteille
             JOIN vino__bouteille_has_vino__cellier ON vino__bouteille.id = vino__bouteille_has_vino__cellier.vino__bouteille_id
             JOIN vino__cellier ON vino__cellier.id = vino__bouteille_has_vino__cellier.vino__cellier_id
             WHERE vino__cellier.vino__utilisateur_id = :user_id
             GROUP BY vino__bouteille_has_vino__cellier.vino__cellier_id",
            ['user_id' => $userId]
        );

        $favorisId = $this->lire(
            "SELECT vino__bouteille_id FROM vino__favoris WHERE vino__utilisateur_id = :user_id",
            ['user_id' => $userId]
        );

        return (object) [
            'utilisateur' => $utilisateur,
            'celliers' => is_array($celliers) ? $celliers : [],
            'stats' => is_array($stats) ? $stats : [],
            'favorisId' => is_array($favorisId) ? $favorisId : [],
        ];
    }

    public function tout($params)
    {
        return $this->bootstrap($params);
    }

    public function un($params, $idEntite = null)
    {
        return $this->bootstrap($params);
    }

    public function ajouter($entite)
    {
        return false;
    }

    public function remplacer($id, $entite)
    {
        return false;
    }

    public function changer($params, $idEntite = null, $fragment = null)
    {
        return false;
    }

    public function retirer($params, $idEntite = null)
    {
        return false;
    }
}
