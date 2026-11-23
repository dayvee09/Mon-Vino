<?php
/**
 * Local (MySQL) authentication — alongside Cognito.
 *
 * POST  /api-php/local/login/auth     body: { email, password }
 * POST  /api-php/local/password/auth  body: { currentPassword, newPassword }
 *       Authorization: Bearer <token>
 */
class AuthControleur extends Controleur
{
    public function tout($params)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Méthode non supportée.'];
    }

    public function un($params, $idEntite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Méthode non supportée.'];
    }

    public function ajouter($entite)
    {
        $payload = json_decode($entite);
        $action = $this->actionDepuisRoute();

        if ($action === 'password') {
            $this->changerMotDePasse($payload);
            return;
        }

        $this->login($payload);
    }

    public function remplacer($id, $entite)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Méthode non supportée.'];
    }

    public function changer($params, $idEntite = null, $fragmentEntite = null)
    {
        if (is_string($idEntite) && $fragmentEntite === null) {
            $fragmentEntite = $idEntite;
        }
        $payload = is_string($fragmentEntite)
            ? json_decode($fragmentEntite)
            : $fragmentEntite;
        $this->changerMotDePasse($payload);
    }

    public function retirer($params, $idEntite = null)
    {
        $this->reponse['entete_statut'] = 'HTTP/1.1 405 Method Not Allowed';
        $this->reponse['corps'] = ['erreur' => 'Méthode non supportée.'];
    }

    private function login($payload)
    {
        if (
            !$payload ||
            !isset($payload->email, $payload->password) ||
            !is_string($payload->email) ||
            !is_string($payload->password)
        ) {
            $this->reponse['entete_statut'] = 'HTTP/1.1 400 Bad Request';
            $this->reponse['corps'] = [
                'erreur' => 'Courriel et mot de passe requis.',
            ];
            return;
        }

        $result = $this->modele->login(
            trim($payload->email),
            $payload->password
        );
        if ($result === false) {
            $this->reponse['entete_statut'] = 'HTTP/1.1 401 Unauthorized';
            $this->reponse['corps'] = [
                'erreur' => 'Adresse courriel ou mot de passe incorrect.',
            ];
            return;
        }

        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = [
            'token' => $result['token'],
            'utilisateur' => $result['user'],
            'passwordIsDefault' => $result['passwordIsDefault'],
        ];
    }

    private function changerMotDePasse($payload)
    {
        if (
            !$payload ||
            !isset($payload->currentPassword, $payload->newPassword)
        ) {
            $this->reponse['entete_statut'] = 'HTTP/1.1 400 Bad Request';
            $this->reponse['corps'] = [
                'erreur' => 'Mot de passe actuel et nouveau requis.',
            ];
            return;
        }

        $token = $this->bearerToken();
        if ($token === '' && isset($payload->token) && is_string($payload->token)) {
            $token = $payload->token;
        }

        $result = $this->modele->changerMotDePasse(
            $token,
            $payload->currentPassword,
            $payload->newPassword
        );

        if (empty($result['ok'])) {
            $status = ($result['erreur'] ?? '') === 'Session invalide ou expirée.'
                ? 'HTTP/1.1 401 Unauthorized'
                : 'HTTP/1.1 400 Bad Request';
            $this->reponse['entete_statut'] = $status;
            $this->reponse['corps'] = [
                'erreur' => $result['erreur'] ?? 'Échec de la modification.',
            ];
            return;
        }

        $this->reponse['entete_statut'] = 'HTTP/1.1 200 OK';
        $this->reponse['corps'] = ['ok' => true];
    }

    private function actionDepuisRoute()
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        $parts = array_values(array_filter(explode('/', (string) $path), 'strlen'));
        $apiPhp = array_search('api-php', $parts, true);
        if ($apiPhp === false) {
            return 'login';
        }
        $offset = $apiPhp + 1;
        if (isset($parts[$offset]) && $parts[$offset] === 'index.php') {
            $offset++;
        }
        // /api-php/{clé}/{valeur}/{collection} → valeur is action hint when clé=local
        return isset($parts[$offset + 1])
            ? strtolower($parts[$offset + 1])
            : 'login';
    }

    private function bearerToken()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
            return $m[1];
        }
        return '';
    }
}
