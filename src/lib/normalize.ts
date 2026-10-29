export function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Texto em caixa alta, sem acento e só com letras/números — base para comparar descrições. */
export function normalizeText(s: string) {
  return stripAccents(s).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

/** Valida EAN-8 / UPC-12 / EAN-13 / GTIN-14 pelo dígito verificador. */
export function isGtin(code: string) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 !== check) return false;
  const body = code.replace(/^0+/, "");
  // Prefixo 2 = códigos internos de balança/loja, não identificam o produto entre mercados
  return body.length >= 8 && !body.startsWith("2");
}

/**
 * Chave que identifica um produto entre notas. Se o código da nota é um EAN válido,
 * ele vale entre mercados diferentes; senão usamos a descrição normalizada.
 */
export function itemKey(item: { name: string; code?: string }) {
  const code = item.code?.trim();
  if (code && isGtin(code)) return `GTIN ${code.replace(/^0+/, "")}`;
  return normalizeText(item.name);
}

const KEEP_UPPER = new Set(["UHT", "PET", "PCT", "CX", "FD", "DZ", "UN", "KG", "ML", "TP"]);
const LOWER_WORDS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "C/", "S/", "P/", "COM", "SEM", "AO", "A", "EM"]);

/** "LEITE UHT ITALAC INTEGRAL 1L" -> "Leite UHT Italac Integral 1L" */
export function prettyName(raw: string) {
  const words = raw.replace(/\s+/g, " ").trim().split(" ");
  return words
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (/\d/.test(w)) {
        // Códigos como "T1", "Z3" ficam em maiúsculas; medidas ("1L", "500G", "C/12") ficam legíveis
        if (/^[A-Z]{1,2}\d+$/i.test(w)) return upper;
        return w
          .toLowerCase()
          .replace(/(\d)l\b/g, "$1L")
          .replace(/^c\/(\d)/, "c/$1");
      }
      if (KEEP_UPPER.has(upper)) return upper;
      if (i > 0 && LOWER_WORDS.has(upper)) return w.toLowerCase();
      const lower = w.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const LEGAL_SUFFIX = /\b(LTDA\.?|S\.?\s?A\.?|S\/A|EIRELI|EPP|ME|MEI|LIMITADA)\b\.?/gi;

/** "SUPERMERCADOS ALVORADA S.A." -> "Supermercados Alvorada" */
export function prettyStore(raw: string) {
  const cleaned = raw.replace(LEGAL_SUFFIX, " ").replace(/[-–,.]+\s*$/g, "").replace(/\s+/g, " ").trim();
  return prettyName(cleaned || raw);
}
