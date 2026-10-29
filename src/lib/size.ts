import { stripAccents } from "./normalize";

export type Base = "kg" | "L" | "un";

/** Tamanho da embalagem, já convertido para kg, litro ou unidades. */
export type PackSize = { amount: number; base: Base };

const UNITS: Record<string, { base: Base; factor: number }> = {
  KG: { base: "kg", factor: 1 },
  G: { base: "kg", factor: 0.001 },
  GR: { base: "kg", factor: 0.001 },
  GRS: { base: "kg", factor: 0.001 },
  MG: { base: "kg", factor: 0.000001 },
  L: { base: "L", factor: 1 },
  LT: { base: "L", factor: 1 },
  LTS: { base: "L", factor: 1 },
  ML: { base: "L", factor: 0.001 },
};

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(KG|GRS|GR|G|MG|LTS|LT|L|ML)`;
const parseNum = (s: string) => Number.parseFloat(s.replace(",", "."));

/**
 * Lê o tamanho da embalagem na descrição da nota:
 * "ARROZ TIO JOAO 5KG" → 5 kg · "AGUA 1,5L" → 1,5 L · "CERV 12X350ML" → 4,2 L ·
 * "OVOS C/12" → 12 un · "PH NEVE LV12 PG11" → 12 un · "TOALHA 2RL" → 2 un.
 */
export function packSize(name: string): PackSize | undefined {
  const s = stripAccents(name).toUpperCase().replace(/\s+/g, " ");

  const multi = s.match(new RegExp(String.raw`(?:^|[^\d])(\d{1,3}) ?X ?${NUM} ?${UNIT}(?![A-Z])`));
  if (multi) {
    const u = UNITS[multi[3]];
    const amount = Number(multi[1]) * parseNum(multi[2]) * u.factor;
    if (amount > 0) return { amount, base: u.base };
  }

  const all = [...s.matchAll(new RegExp(String.raw`(?:^|[^\d.,])${NUM} ?${UNIT}(?![A-Z])`, "g"))];
  const last = all[all.length - 1];
  if (last) {
    const u = UNITS[last[2]];
    const amount = parseNum(last[1]) * u.factor;
    if (amount > 0) return { amount, base: u.base };
  }

  const count =
    s.match(/(?:^| )C\/? ?(\d+)(?![A-Z\d])/) ??
    s.match(/(?:^| )(\d+) ?(?:UN|UND|UNID|RL|ROLOS?|SACHES?)(?![A-Z])/) ??
    s.match(/(?:^| )LV ?(\d+)/) ??
    s.match(/(?:^| )L(\d+)P\d+(?![A-Z])/);
  if (count) {
    const n = Number(count[1]);
    if (n > 1) return { amount: n, base: "un" };
  }
  return undefined;
}

export type UnitPricing = { value: number; base: Base; size?: PackSize };

/**
 * Preço por kg, litro ou unidade. Itens pesados (vendidos em KG) já vêm com preço por kg;
 * os outros usam o tamanho escrito na descrição.
 */
export function unitPricing(name: string, unit: string, unitPrice: number): UnitPricing | undefined {
  const u = unit.toUpperCase();
  if (u === "KG") return { value: unitPrice, base: "kg" };
  if (u === "L" || u === "LT") return { value: unitPrice, base: "L" };
  const size = packSize(name);
  if (!size) return undefined;
  return { value: unitPrice / size.amount, base: size.base, size };
}

export const perLabel = (base: Base) => (base === "kg" ? "/kg" : base === "L" ? "/L" : "/un");

export function formatSize(size: PackSize) {
  const fmt = (n: number, d = 2) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(n);
  if (size.base === "un") return `${fmt(size.amount, 0)} un`;
  if (size.base === "kg") return size.amount < 1 ? `${fmt(size.amount * 1000, 0)} g` : `${fmt(size.amount)} kg`;
  return size.amount < 1 ? `${fmt(size.amount * 1000, 0)} ml` : `${fmt(size.amount)} L`;
}

/** Abreviações que aparecem no começo da descrição → nome do tipo de produto. */
const FAMILY_ALIASES: Record<string, string> = {
  LTE: "LEITE", LT: "LEITE", FEIJ: "FEIJAO", QJ: "QUEIJO", QJO: "QUEIJO", MAC: "MACARRAO", MARG: "MARGARINA",
  REQ: "REQUEIJAO", IOG: "IOGURTE", REFRIG: "REFRIGERANTE", REFRI: "REFRIGERANTE", REFR: "REFRIGERANTE",
  DET: "DETERGENTE", DETERG: "DETERGENTE", AMAC: "AMACIANTE", ACUC: "ACUCAR", CERV: "CERVEJA",
  ACHOC: "ACHOCOLATADO", BISC: "BISCOITO", CHOC: "CHOCOLATE", AZ: "AZEITE", CD: "CREME DENTAL",
  PH: "PAPEL HIGIENICO", HIG: "HIGIENICO", SAB: "SABONETE", DEO: "DESODORANTE", MUSS: "MUSSARELA", F: "FARINHA",
};

/** Palavras genéricas demais sozinhas: usamos as duas primeiras palavras. */
const TWO_WORDS = new Set(["PAPEL", "CREME", "CR", "SUCO", "MOLHO", "OLEO", "AGUA", "SABAO"]);

/**
 * Tipo do produto para comparar embalagens: "ARROZ TIO JOAO 5KG" e "ARROZ SOLITO 1KG" → "ARROZ".
 * Não precisa ser perfeito — só agrupa candidatos, que ainda precisam ter a mesma categoria e a mesma base.
 */
export function familyKey(name: string) {
  const words = stripAccents(name)
    .toUpperCase()
    .replace(/[^A-Z ]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (!words.length) return "";
  const first = FAMILY_ALIASES[words[0]] ?? words[0];
  if (TWO_WORDS.has(first) && words[1]) return `${first} ${FAMILY_ALIASES[words[1]] ?? words[1]}`;
  return first;
}
