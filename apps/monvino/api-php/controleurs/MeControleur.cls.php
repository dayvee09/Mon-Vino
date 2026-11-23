<?php
/**
 * GET /email/{email}/me — session bootstrap (user + celliers + stats + favoris IDs).
 */
class MeControleur extends Controleur
{
    public function tout($params)
    {
        $email = isset($params['email']) ? trim((string) $params['email']) : '';
        if ($email === '') {
            $this->reponse['entete_statut'] = 'HTTP/1.1 400 Bad Request';
            $this->reponse['corps'] = ['erreur' => 'email requis'];
            return;
        }

        $data = $this->modele->bootstrap($params);
        if ($data === false) {
            $this->reponse['entete_statut'] = 'HTTP/1.1 404 Not Found';
            $this->reponse['corps'] = ['erreur' => 'Utilisateur introuvable'];
            return;
        }

        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = $data;
    }

    public function un($params, $idEntite)
    {
        $this->tout($params);
    }

    public function ajouter($entite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Non supporté'];
    }

    public function remplacer($id, $entite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Non supporté'];
    }

    public function changer($params, $idEntite, $fragmentEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Non supporté'];
    }

    public function retirer($params, $idEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Non supporté'];
    }
}
