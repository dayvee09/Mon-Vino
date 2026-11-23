# Base de données Mon Vino

## Fichier versionné

| Fichier | Usage |
|---------|--------|
| `monvino-starter.sql` | Schéma + données de démo génériques pour nouveaux contributeurs |

Tout autre fichier `.sql` dans ce dossier est **ignoré par Git** (dumps personnels / production). Ne les ajoutez pas au dépôt.

## Import (développement ou première install)

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pw2 CHARACTER SET utf8mb4;"
mysql -u root -p pw2 < apps/monvino/database/monvino-starter.sql
```

En conteneur de développement, MariaDB charge automatiquement `monvino-starter.sql` au premier démarrage.

## Comptes de démo inclus

| Compte | Courriel | Mot de passe | Rôle |
|--------|----------|--------------|------|
| **Admin local** | `admin@example.com` | `Admin123!` | `admin` — cellier `#1` (catalogue SAQ) |
| **Démo** | `demo@example.com` | *(Cognito seulement)* | utilisateur — cellier `#2` |

### Connexion admin (sans Cognito)

Sur l’écran de connexion Amplify, ouvrez **Connexion admin**, puis utilisez :

- **Courriel :** `admin@example.com`
- **Mot de passe :** `Admin123!`

Ce compte est authentifié par MySQL (`vino__utilisateur.mdp`), pas par AWS Cognito. Changez le mot de passe dès la première connexion : **Profil → Mot de passe → Modifier**.

Les utilisateurs Cognito (Google, Amazon, courriel Cognito) continuent de fonctionner en parallèle ; leur colonne `mdp` reste `NULL`.

### Promouvoir un autre utilisateur en admin

```sql
UPDATE vino__utilisateur SET privilege = 'admin' WHERE email = 'votre-email@example.com';
```

Pour un admin **local** (mot de passe MySQL), définissez aussi un hash bcrypt :

```sql
-- Exemple PHP : password_hash('VotreMotDePasse', PASSWORD_DEFAULT)
UPDATE vino__utilisateur
SET privilege = 'admin',
    mdp = '$2y$10$...'
WHERE email = 'votre-email@example.com';
```

## Archives de production

`./scripts/build-monvino.sh` inclut `monvino-starter.sql` dans le tarball. Importez-le sur le serveur, puis changez immédiatement le mot de passe admin local et la valeur `session_secret` dans `api-php/config.local.php`.
