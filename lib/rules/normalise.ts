const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

/** Cards print digits in Arabic-Indic or Persian forms; every rule works on 0–9. */
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= PERSIAN_ZERO ? code - PERSIAN_ZERO : code - ARABIC_INDIC_ZERO);
  });
}

/** Upper-case, Western digits, and one space wherever the card used spaces, dashes or dots. */
export function normaliseToken(s: string): string {
  return toWesternDigits(s)
    .toUpperCase()
    .replace(/[\s\-–—.]+/g, " ")
    .trim();
}
