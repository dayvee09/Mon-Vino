import placeholderBouteille from "./img/svg/placeholder-bouteille.svg";

/**
 * Shared bottle image fallback (custom bottles, missing SAQ art, pastilles).
 * Navy bottle with Mon Vino logo on the cream label.
 */
export { placeholderBouteille };

/**
 * @param {unknown} image
 * @returns {string}
 */
export function resolveBottleImage(image) {
  if (typeof image !== "string") {
    return placeholderBouteille;
  }
  const trimmed = image.trim();
  if (!trimmed) {
    return placeholderBouteille;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("pastille_gout") ||
    lower.includes("/placeholder/") ||
    lower.includes("placeholder_1.png") ||
    lower.includes("placeholder-saq") ||
    lower.includes("placeholder-bouteille") ||
    lower.includes("placeholder_bouteille")
  ) {
    return placeholderBouteille;
  }
  return trimmed;
}

/**
 * @param {unknown} image
 * @returns {boolean}
 */
export function isBottlePlaceholder(image) {
  return resolveBottleImage(image) === placeholderBouteille;
}
