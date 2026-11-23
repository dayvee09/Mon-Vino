import {
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  signOut,
  deleteUser,
  updatePassword,
  updateUserAttribute,
} from "aws-amplify/auth";

export function looksLikeFederatedUsername(value) {
  return /^(google|facebook|amazon|signinwithapple)_/i.test(String(value || ""));
}

/** True when the value is usable as a Mon Vino account email (not a Cognito subject). */
export function isUsableAccountEmail(value) {
  return (
    typeof value === "string" &&
    value.includes("@") &&
    !looksLikeFederatedUsername(value)
  );
}

function pickEmail(...candidates) {
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || looksLikeFederatedUsername(trimmed)) continue;
    return trimmed;
  }
  return null;
}

function emailFromTokenPayload(payload) {
  if (!payload) return null;
  return (
    pickEmail(payload.email, payload.preferred_username) ||
    (typeof payload["cognito:username"] === "string"
      ? payload["cognito:username"].trim()
      : null)
  );
}

/** Sync-friendly identity from the Authenticator user object (no network). */
export function emailFromCognitoUser(user) {
  if (!user) return null;
  return pickEmail(user.signInDetails?.loginId);
}

export function fallbackIdentityFromCognitoUser(user) {
  if (!user) return null;
  const candidates = [
    user.signInDetails?.loginId,
    user.username,
    user.userId,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Resolve the signed-in user's email with at most one cached session read
 * and one User Pool attributes call. Never force-refresh — that hits
 * Cognito Identity and can rate-limit the app into a death spiral.
 */
export async function getUserEmail(cognitoUser) {
  const fromUser = emailFromCognitoUser(cognitoUser);
  if (fromUser) return fromUser;

  let currentUser = cognitoUser || null;
  if (!currentUser) {
    try {
      currentUser = await getCurrentUser();
    } catch (err) {
      console.warn("getCurrentUser:", err);
      return null;
    }
  }

  let federatedFallback = null;
  try {
    const session = await fetchAuthSession();
    const fromToken = emailFromTokenPayload(session.tokens?.idToken?.payload);
    if (fromToken && !looksLikeFederatedUsername(fromToken)) {
      return fromToken;
    }
    federatedFallback = fromToken;
  } catch (err) {
    console.warn("fetchAuthSession:", err);
  }

  try {
    const attributes = await fetchUserAttributes();
    if (attributes.email) {
      return attributes.email;
    }
  } catch (err) {
    // Rate limits / identity-pool 400s — fall through to local identity.
    console.warn("fetchUserAttributes:", err);
  }

  const fallback =
    federatedFallback || fallbackIdentityFromCognitoUser(currentUser);
  // Never return google_/facebook_/… subjects — those create empty shadow accounts.
  if (isUsableAccountEmail(fallback)) {
    return fallback;
  }
  return null;
}

/** @deprecated Prefer getUserEmail(cognitoUser) — kept for call sites. */
export async function getUserEmailWithRetry(_maxAttempts, _delayMs, cognitoUser) {
  return getUserEmail(cognitoUser);
}

export {
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  signOut,
  deleteUser,
  updatePassword,
  updateUserAttribute,
};
