const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = (digits: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits });

export const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, "0");

export function money(n: number) {
  return brl.format(Number.isFinite(n) ? n : 0).replace(/ /g, " ");
}

/** "R$ 1.234,56" -> { symbol: "R$", int: "1.234", cents: ",56" } */
export function moneyParts(n: number) {
  const s = money(n);
  const negative = s.includes("-");
  const body = s.replace("R$", "").replace("-", "").trim();
  const i = body.lastIndexOf(",");
  return { symbol: "R$", negative, int: body.slice(0, i), cents: body.slice(i) };
}

export function moneyCompact(n: number) {
  if (Math.abs(n) >= 1000) return `R$ ${num(1).format(n / 1000)} mil`;
  return `R$ ${Math.round(n)}`;
}

/** 0.123 -> "+12,3%" */
export function percent(ratio: number, digits = 1) {
  const rounded = Number((ratio * 100).toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toFixed(digits).replace(".", ",")}%`;
}

export function isWeight(unit: string) {
  return ["KG", "G", "GR"].includes(unit.toUpperCase());
}

export function unitLabel(unit: string) {
  const u = unit.toUpperCase();
  if (u === "KG") return "kg";
  if (u === "G" || u === "GR") return "g";
  if (u === "L" || u === "LT") return "L";
  if (["UN", "UND", "UNID", "UNI"].includes(u)) return "un";
  return u.toLowerCase();
}

export function formatQty(q: number, unit: string) {
  return `${num(isWeight(unit) ? 3 : 2).format(q)} ${unitLabel(unit)}`;
}

/** "2026-10-12T18:33:22" -> "2026-10" */
export const monthOf = (iso: string) => iso.slice(0, 7);

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** "2026-10" -> "Outubro" (ou "Outubro de 2025" quando não é o ano atual) */
export function monthName(key: string, opts: { year?: boolean } = {}) {
  const [y, m] = key.split("-").map(Number);
  const showYear = opts.year ?? y !== new Date().getFullYear();
  return cap(MONTHS[m - 1]) + (showYear ? ` de ${y}` : "");
}

/** Para usar no meio de frases: "outubro" / "outubro de 2025" */
export const monthLower = (key: string, opts: { year?: boolean } = {}) => monthName(key, opts).toLowerCase();

/** "2026-10" -> "out" */
export function monthShort(key: string) {
  const m = Number(key.split("-")[1]);
  return MONTHS_SHORT[m - 1];
}

export function parseLocal(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
}

/** "12 out · 18:33" */
export function dateTime(iso: string) {
  const d = parseLocal(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Hoje", "Ontem" ou "12 out" */
export function relativeDay(iso: string) {
  const d = parseLocal(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const sameYear = d.getFullYear() === today.getFullYear();
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

/** "Quarta-feira, 29 de outubro" */
export function todayLabel() {
  const d = new Date();
  return `${cap(WEEKDAYS[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
