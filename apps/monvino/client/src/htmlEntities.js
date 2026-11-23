/**
 * Decode HTML entities from SAQ text (&eacute;, sometimes double-encoded).
 * @param {unknown} value
 * @returns {string}
 */
export function decodeHtmlEntities(value) {
  if (value == null) return "";
  let text = String(value);
  if (!text.includes("&")) return text;

  const textarea = document.createElement("textarea");
  for (let i = 0; i < 3; i++) {
    textarea.innerHTML = text;
    const decoded = textarea.value;
    if (decoded === text) break;
    text = decoded;
  }
  return text;
}
