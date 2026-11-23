import { useState } from "react";
import { localLogin, writeLocalSession } from "./localAuth";
import "./LocalAdminLogin.scss";

const LAST_EMAIL_KEY = "monvino.localAdminEmail";

function readLastEmail() {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Local MySQL admin login (alongside Cognito / Amplify Authenticator).
 */
export default function LocalAdminLogin({ uri, onSuccess }) {
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState(() => readLastEmail());
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  async function gererSoumettre(event) {
    event.preventDefault();
    if (!uri || loading) return;
    setErreur("");
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const result = await localLogin(uri, trimmedEmail, password);
      const session = {
        token: result.token,
        utilisateur: result.utilisateur,
        passwordIsDefault: Boolean(result.passwordIsDefault),
      };
      try {
        localStorage.setItem(
          LAST_EMAIL_KEY,
          result.utilisateur?.email || trimmedEmail
        );
      } catch {
        /* ignore */
      }
      writeLocalSession(session);
      onSuccess?.(session);
    } catch (err) {
      setErreur(err?.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="LocalAdminLogin LocalAdminLogin--collapsed">
        <button
          type="button"
          className="LocalAdminLogin__toggle"
          onClick={() => setOuvert(true)}
        >
          Connexion admin
        </button>
      </div>
    );
  }

  return (
    <div className="LocalAdminLogin">
      <h2 className="LocalAdminLogin__title">Connexion admin</h2>
      <form className="LocalAdminLogin__form" onSubmit={gererSoumettre}>
        <label className="LocalAdminLogin__label" htmlFor="local-admin-email">
          Courriel
        </label>
        <input
          id="local-admin-email"
          className="LocalAdminLogin__input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label
          className="LocalAdminLogin__label"
          htmlFor="local-admin-password"
        >
          Mot de passe
        </label>
        <input
          id="local-admin-password"
          className="LocalAdminLogin__input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erreur && (
          <p className="LocalAdminLogin__error" role="alert">
            {erreur}
          </p>
        )}
        <div className="LocalAdminLogin__actions">
          <button
            type="button"
            className="LocalAdminLogin__cancel"
            onClick={() => {
              setOuvert(false);
              setErreur("");
              setPassword("");
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="LocalAdminLogin__submit"
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </div>
      </form>
    </div>
  );
}
