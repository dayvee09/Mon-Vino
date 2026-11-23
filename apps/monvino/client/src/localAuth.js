const STORAGE_KEY = "monvino.localAuth";

export function readLocalSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.utilisateur?.email) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeLocalSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearLocalSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLocalSession(session) {
  return Boolean(session?.token && session?.utilisateur);
}

/**
 * POST local login. Returns { token, utilisateur, passwordIsDefault } or throws.
 */
export async function localLogin(uri, email, password) {
  const response = await fetch(`${uri}/local/login/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.erreur || "Adresse courriel ou mot de passe incorrect."
    );
  }
  return body;
}

/**
 * Change password for a local session user.
 */
export async function localChangePassword(
  uri,
  token,
  currentPassword,
  newPassword
) {
  const response = await fetch(`${uri}/local/password/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // token also in body — some Apache setups strip Authorization
    body: JSON.stringify({ token, currentPassword, newPassword }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.erreur || "Échec de la modification du mot de passe.");
  }
  return body;
}
