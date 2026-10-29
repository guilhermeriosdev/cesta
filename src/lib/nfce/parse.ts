import * as cheerio from "cheerio";
import type { ReceiptItem } from "../types";

export type ParsedNfce = {
  store: { name: string; cnpj?: string; address?: string };
  issuedAt?: string;
  accessKey?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount: number;
  total?: number;
  payment?: string;
};

const clean = (s: string | undefined) => (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** "1.234,56" -> 1234.56 · "Qtde.:0,385" -> 0.385 · "1.0000" -> 1 */
export function parseBRNumber(input: string | undefined | null): number {
  const tokens = input?.match(/\d[\d.,]*/g);
  if (!tokens) return NaN;
  let t = tokens[tokens.length - 1].replace(/[.,]+$/, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function lastMatch(text: string, re: RegExp) {
  const all = [...text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))];
  return all.length ? all[all.length - 1] : null;
}

function finalizeItem(raw: {
  code?: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}): ReceiptItem | null {
  const name = clean(raw.name);
  if (!name) return null;
  let { qty, unitPrice, total } = raw;
  if (!(qty > 0)) qty = total > 0 && unitPrice > 0 ? total / unitPrice : 1;
  if (!Number.isFinite(total)) total = Number.isFinite(unitPrice) ? qty * unitPrice : NaN;
  if (!Number.isFinite(total)) return null;
  if (!Number.isFinite(unitPrice)) unitPrice = total / qty;
  return {
    code: raw.code?.trim() || undefined,
    name,
    qty: round(qty, 4),
    unit: (clean(raw.unit) || "UN").toUpperCase(),
    unitPrice: round(unitPrice, 4),
    total: round(total, 2),
  };
}

/** Layout padrão usado pela maioria das SEFAZ (SP, PR, RJ, BA, GO, DF, SVRS...). */
function standardItems($: cheerio.CheerioAPI) {
  const items: ReceiptItem[] = [];
  $("#tabResult tr").each((_, el) => {
    const tr = $(el);
    const name = clean(tr.find("span.txtTit2, span.txtTit").first().text());
    if (!name) return;
    const code = clean(tr.find(".RCod").text()).match(/C[óo]d(?:igo)?\.?\s*:?\s*([\w.-]+)/i)?.[1];
    const item = finalizeItem({
      code,
      name,
      qty: parseBRNumber(clean(tr.find(".Rqtd").text())),
      unit: clean(tr.find(".RUN").text()).replace(/^UN\s*:?\s*/i, ""),
      unitPrice: parseBRNumber(clean(tr.find(".RvlUnit").text())),
      total: parseBRNumber(clean(tr.find(".valor").text())),
    });
    if (item) items.push(item);
  });
  return items;
}

/** Plano B: lê qualquer linha de tabela que tenha "Código" + "Qtde" (ex.: portal de MG). */
function textItems($: cheerio.CheerioAPI) {
  const items: ReceiptItem[] = [];
  $("tr").each((_, el) => {
    const tr = $(el);
    if (tr.find("tr").length) return;
    const t = clean(tr.text());
    if (!/C[óo]d(?:igo)?\.?\s*:/i.test(t) || !/Qtde?\.?/i.test(t)) return;
    const item = finalizeItem({
      name: t.split(/\(\s*C[óo]d/i)[0],
      code: t.match(/C[óo]d(?:igo)?\.?\s*:\s*([\w.-]+)/i)?.[1],
      qty: parseBRNumber(t.match(/Qtde?\.?(?:\s*total\s*de\s*[íi]tens)?\s*:?\s*([\d.,]+)/i)?.[1]),
      unit: t.match(/\bUN\s*:\s*([A-Za-z]+)/)?.[1] ?? "UN",
      unitPrice: parseBRNumber(t.match(/Vl\.?\s*Unit(?:\.|[áa]rio)?\s*:?\s*(?:R\$)?\s*([\d.,]+)/i)?.[1]),
      total: parseBRNumber(t.match(/(?:Vl\.?|Valor)\s*total\s*(?:R\$)?\s*:?\s*(?:R\$)?\s*([\d.,]+)/i)?.[1]),
    });
    if (item) items.push(item);
  });
  return items;
}

export function parseNfceHtml(html: string): ParsedNfce {
  // Espaço entre tags para o texto de elementos vizinhos não grudar ("UN: UNVl. Unit.")
  const $ = cheerio.load(html.replace(/>\s*</g, "> <"));
  const body = clean($("body").text() || $.root().text());

  let items = standardItems($);
  if (!items.length) items = textItems($);

  const name =
    clean($(".txtTopo").first().text()) ||
    clean($("#u20").first().text()) ||
    clean($("h4").first().text()) ||
    "Mercado";
  const cnpj = body.match(/CNPJ\s*:?\s*([\d./-]{14,18})/i)?.[1];
  const address = $(".txtCenter .text")
    .map((_, el) => clean($(el).text()))
    .get()
    .find((t) => !/CNPJ/i.test(t) && t.length > 8)
    ?.replace(/\s*,[\s,]*/g, ",")
    .replace(/^,|,$/g, "")
    .replace(/,/g, ", ");

  const date =
    body.match(/Emiss[ãa]o\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})\D{0,12}(\d{2}):(\d{2})(?::(\d{2}))?/i) ??
    body.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  const issuedAt = date ? `${date[3]}-${date[2]}-${date[1]}T${date[4]}:${date[5]}:${date[6] ?? "00"}` : undefined;

  const chave = clean($(".chave").first().text()).replace(/\D/g, "");
  const accessKey =
    chave.length === 44 ? chave : body.match(/(?:\d{4}\s?){10}\d{4}/)?.[0].replace(/\D/g, "") || undefined;

  const totals = clean($("#totalNota").text()) || body;
  const subtotal = parseBRNumber(lastMatch(totals, /Valor\s*total\s*R\$\s*:?\s*([\d.,]+)/i)?.[1]);
  const discount = parseBRNumber(lastMatch(totals, /Descontos?\s*R\$\s*:?\s*([\d.,]+)/i)?.[1]);
  const toPay = parseBRNumber(lastMatch(totals, /Valor\s*a\s*pagar\s*R\$\s*:?\s*([\d.,]+)/i)?.[1]);
  const payment =
    $("#totalNota label.tx")
      .map((_, el) => clean($(el).text()))
      .get()
      .filter((t) => t && !/troco/i.test(t))
      .join(", ") || undefined;

  return {
    store: { name, cnpj, address: address || undefined },
    issuedAt,
    accessKey,
    items,
    subtotal: Number.isFinite(subtotal) ? subtotal : undefined,
    discount: Number.isFinite(discount) ? discount : 0,
    total: Number.isFinite(toPay) ? toPay : undefined,
    payment,
  };
}

/** Texto visível da página (sem scripts/estilos), para logs e mensagens. */
export function visibleText(html: string) {
  const $ = cheerio.load(html.replace(/>\s*</g, "> <"));
  $("script, style, noscript").remove();
  return clean($("body").text() || $.root().text());
}

/**
 * Mensagem de erro que o portal mostra num pop-up (ex.: SP: "QR Code inválido",
 * "nota não encontrada"). Em SP ela é injetada por script: $('#spnErro…').html('…').
 */
export function portalErrorMessage(html: string): string | undefined {
  const fromScript = html.match(/#spnErro\w*['"]\)\.html\(\s*'((?:[^'\\]|\\.)*)'/)?.[1];
  const $ = cheerio.load(html.replace(/>\s*</g, "> <"));
  const raw = fromScript ?? $("#spnErroMaster, #spnErroProsseguirMaster, #lblErro, .msgErro").text();
  const text = clean(cheerio.load(`<div>${(raw ?? "").replace(/<br\s*\/?>|<\/br>/gi, " ")}</div>`)("div").text())
    .replace(/\s*Erro\(s\):\s*-?\s*/i, " ")
    .trim();
  return text || undefined;
}

/** Alguns portais (ex.: RS) entregam a nota dentro de um iframe ou com redirecionamento por JS. */
export function findInnerDocumentUrl(html: string, base: URL): URL | undefined {
  const $ = cheerio.load(html);
  const candidates = [
    $("iframe[src]").attr("src"),
    $("frame[src]").attr("src"),
    $('meta[http-equiv="refresh" i]').attr("content")?.match(/url=(.+)$/i)?.[1],
    // Só confia em location= de páginas pequenas (páginas de redirecionamento), não de portais cheios de script
    html.length < 5000 ? html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/)?.[1] : undefined,
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return new URL(c.trim().replace(/^['"]|['"]$/g, ""), base);
    } catch {
      // ignora URL inválida
    }
  }
  return undefined;
}
