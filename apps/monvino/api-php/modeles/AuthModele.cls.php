<?php
class AuthModele extends AccesBd
{
    private const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
    private const TOKEN_TTL_SECONDS = 604800; // 7 days

    /**
     * @return object|false User row including mdp hash
     */
    public function parEmailAvecMdp($email)
    {
        $row = $this->lireUn(
            "SELECT id, email, nom, privilege, mdp FROM vino__utilisateur WHERE email = :email",
            ['email' => $email]
        );
        return is_object($row) ? $row : false;
    }

    /**
     * @return object|false User row including mdp hash
     */
    public function parIdAvecMdp($userId)
    {
        $row = $this->lireUn(
            "SELECT id, email, nom, privilege, mdp FROM vino__utilisateur WHERE id = :id",
            ['id' => (int) $userId]
        );
        return is_object($row) ? $row : false;
    }

    /**
     * Authenticate a local (MySQL) user. Cognito-only rows (mdp NULL) are rejected.
     *
     * @return array{user: object, token: string, passwordIsDefault: bool}|false
     */
    public function login($email, $password)
    {
        $user = $this->parEmailAvecMdp($email);
        if ($user === false || empty($user->mdp)) {
            return false;
        }
        if (!password_verify($password, $user->mdp)) {
            return false;
        }

        $public = $this->publicUser($user);
        return [
            'user' => $public,
            'token' => $this->creerToken((int) $user->id, $user->email),
            'passwordIsDefault' => password_verify(
                self::DEFAULT_ADMIN_PASSWORD,
                $user->mdp
            ),
        ];
    }

    /**
     * Change password for a local user. Requires a valid session token.
     *
     * @return array{ok: bool, erreur?: string}
     */
    public function changerMotDePasse($token, $currentPassword, $newPassword)
    {
        $claims = $this->verifierToken($token);
        if ($claims === false) {
            return ['ok' => false, 'erreur' => 'Session invalide ou expirée.'];
        }

        // Prefer uid so email changes do not invalidate the session token.
        $user = $this->parIdAvecMdp($claims['uid']);
        if ($user === false) {
            return ['ok' => false, 'erreur' => 'Utilisateur introuvable.'];
        }
        if (empty($user->mdp)) {
            return [
                'ok' => false,
                'erreur' => 'Ce compte utilise Cognito; changez le mot de passe via AWS.',
            ];
        }
        if (!password_verify($currentPassword, $user->mdp)) {
            return ['ok' => false, 'erreur' => 'Mot de passe actuel incorrect.'];
        }
        if (!is_string($newPassword) || strlen($newPassword) < 8) {
            return [
                'ok' => false,
                'erreur' => 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
            ];
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->modifier(
            "UPDATE vino__utilisateur SET mdp = :mdp WHERE id = :id",
            ['mdp' => $hash, 'id' => (int) $user->id]
        );

        return ['ok' => true];
    }

    /**
     * @return object Public user fields (no password hash)
     */
    public function publicUser($user)
    {
        return (object) [
            'id' => (int) $user->id,
            'email' => $user->email,
            'nom' => $user->nom,
            'privilege' => $user->privilege,
        ];
    }

    public function creerToken($userId, $email)
    {
        $payload = [
            'uid' => (int) $userId,
            'email' => $email,
            'exp' => time() + self::TOKEN_TTL_SECONDS,
        ];
        $body = $this->base64UrlEncode(json_encode($payload));
        $sig = hash_hmac('sha256', $body, $this->sessionSecret());
        return $body . '.' . $sig;
    }

    /**
     * @return array{uid: int, email: string, exp: int}|false
     */
    public function verifierToken($token)
    {
        if (!is_string($token) || strpos($token, '.') === false) {
            return false;
        }
        [$body, $sig] = explode('.', $token, 2);
        $expected = hash_hmac('sha256', $body, $this->sessionSecret());
        if (!hash_equals($expected, $sig)) {
            return false;
        }
        $json = $this->base64UrlDecode($body);
        $payload = json_decode($json, true);
        if (!is_array($payload) || empty($payload['uid']) || empty($payload['email'])) {
            return false;
        }
        if (empty($payload['exp']) || time() > (int) $payload['exp']) {
            return false;
        }
        return [
            'uid' => (int) $payload['uid'],
            'email' => $payload['email'],
            'exp' => (int) $payload['exp'],
        ];
    }

    private function sessionSecret()
    {
        $configFile = dirname(__DIR__) . '/config.local.php';
        $config = is_readable($configFile) ? require $configFile : [];
        $secret = $config['session_secret'] ?? '';
        if ($secret === '') {
            // Dev fallback so local login works before secret is configured.
            $secret = 'monvino-dev-session-secret-change-me';
        }
        return $secret;
    }

    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode($data)
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
