import placeholderBouteille from "./img/svg/placeholder-bouteille.svg";
import { ReactComponent as PlaceholderBouteilleSvg } from "./img/svg/placeholder-bouteille.svg";

/**
 * Shared bottle image fallback (custom bottles, missing SAQ art, pastilles).
 * Navy bottle with Mon Vino logo on the cream label.
 * Prefer PlaceholderBouteilleSvg in lists so the art paints without a network wait.
 */
export { placeholderBouteille, PlaceholderBouteilleSvg };

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 240;

/**
 * Shrink SAQ / Scene7 product URLs for list grids (fewer bytes on first paint).
 * @param {string} url
 * @returns {string}
 */
export function toThumbnailUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return url;
  }
  let next = url.trim();

  // Protocol-relative Scene7 → https; prefer compact grid preset when missing size.
  if (next.startsWith("//")) {
    next = `https:${next}`;
  }

  if (/scene7\.com/i.test(next)) {
    if (!/[?&]wid=/i.test(next) && !/\$saq-/i.test(next)) {
      const join = next.includes("?") ? "&" : "?";
      return `${next}${join}wid=${THUMB_WIDTH}&hei=${THUMB_HEIGHT}`;
    }
    return next
      .replace(/([?&]wid=)\d+/gi, `$1${THUMB_WIDTH}`)
      .replace(/([?&]hei=)\d+/gi, `$1${THUMB_HEIGHT}`);
  }

  if (/saq\.com\/media\/catalog/i.test(next)) {
    let out = next;
    if (/[?&]width=/i.test(out)) {
      out = out.replace(/([?&]width=)\d+/gi, `$1${THUMB_WIDTH}`);
    } else {
      out += (out.includes("?") ? "&" : "?") + `width=${THUMB_WIDTH}`;
    }
    if (/[?&]height=/i.test(out)) {
      out = out.replace(/([?&]height=)\d+/gi, `$1${THUMB_HEIGHT}`);
    } else {
      out += `&height=${THUMB_HEIGHT}`;
    }
    if (/[?&]canvas=/i.test(out)) {
      out = out.replace(
        /([?&]canvas=)\d+,\d+/gi,
        `$1${THUMB_WIDTH},${THUMB_HEIGHT}`
      );
    } else {
      out += `&canvas=${THUMB_WIDTH},${THUMB_HEIGHT}`;
    }
    if (!/[?&]quality=/i.test(out)) {
      out += "&quality=70";
    } else {
      out = out.replace(/([?&]quality=)\d+/gi, "$170");
    }
    return out;
  }

  return next;
}

/**
 * @param {unknown} image
 * @param {{ size?: 'full' | 'thumb' }} [options]
 * @returns {string}
 */
export function resolveBottleImage(image, options = {}) {
  const size = options.size === "thumb" ? "thumb" : "full";
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
  if (size === "thumb") {
    return toThumbnailUrl(trimmed);
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
