import { describe, expect, it } from "vitest";
import {
  bucketRows,
  buildProducts,
  monthBreakdown,
  monthSummaries,
  monthsWithData,
  recurringProducts,
} from "./analytics";
import { categorize } from "./categories";
import { generateDemoReceipts } from "./demo";
import { isGtin, itemKey, prettyName, prettyStore } from "./normalize";
import type { Prefs, Receipt } from "./types";

const noPrefs: Prefs = { aliases: {}, names: {}, categories: {} };

function receipt(id: string, issuedAt: string, items: [string, number, number, string?][]): Receipt {
  const list = items.map(([name, qty, unitPrice, code]) => ({ name, qty, unitPrice, unit: "UN", total: qty * unitPrice, code }));
  const total = list.reduce((s, i) => s + i.total, 0);
  return {
    id, issuedAt, items: list, subtotal: total, discount: 0, total,
    store: { name: "Mercado" }, source: "demo", createdAt: issuedAt,
  };
}

const receipts = [
  receipt("a", "2026-09-05T10:00:00", [["LEITE UHT 1L", 10, 4], ["CAFE 500G", 1, 20], ["NESCAU 400G", 1, 10]]),
  receipt("b", "2026-10-03T10:00:00", [["LEITE UHT 1L", 10, 5], ["CAFE 500G", 2, 19], ["PANETONE 500G", 1, 30]]),
];

describe("comparação entre meses", () => {
  const products = buildProducts(receipts, noPrefs);

  it("soma por mês", () => {
    const s = monthSummaries(receipts);
    expect(s.get("2026-09")?.total).toBe(70);
    expect(s.get("2026-10")?.total).toBe(118);
    expect(monthsWithData(receipts)).toEqual(["2026-10", "2026-09"]);
  });

  it("separa a diferença em preço, quantidade, novos e removidos — e a conta fecha", () => {
    const b = monthBreakdown(receipts, products, "2026-09", "2026-10");
    // Leite: 10 un, R$ 4 -> R$ 5 => preço +10. Café: 1 -> 2 un, R$ 20 -> R$ 19 => preço -2, quantidade +20
    expect(b.price).toBeCloseTo(8);
    expect(b.quantity).toBeCloseTo(20);
    expect(b.added).toBeCloseTo(30); // panetone
    expect(b.removed).toBeCloseTo(-10); // nescau
    expect(b.other).toBeCloseTo(0);
    expect(b.price + b.quantity + b.added + b.removed + b.other).toBeCloseTo(b.targetTotal - b.baseTotal);
    // mesmos produtos com as quantidades de agora: 88 contra 80 => +10%
    expect(b.priceRatio).toBeCloseTo(0.1);
    expect(bucketRows(b, "price").map((x) => x.row.product.key)).toEqual(["LEITE UHT 1L", "CAFE 500G"]);
    expect(bucketRows(b, "quantity").map((x) => x.row.product.key)).toEqual(["CAFE 500G"]);
  });

  it("compara só até o mesmo dia quando o mês está em andamento", () => {
    const r = [...receipts, receipt("c", "2026-09-20T10:00:00", [["LEITE UHT 1L", 5, 4]])];
    const b = monthBreakdown(r, buildProducts(r, noPrefs), "2026-09", "2026-10", 10);
    expect(b.baseTotal).toBe(70);
    expect(b.rows.find((x) => x.product.key === "LEITE UHT 1L")?.base?.qty).toBe(10);
  });

  it("monta a lista de sempre comprados", () => {
    const rec = recurringProducts(products, ["2026-10", "2026-09"]);
    expect(rec.map((r) => r.product.key).sort()).toEqual(["CAFE 500G", "LEITE UHT 1L"]);
    expect(rec.find((r) => r.product.key === "LEITE UHT 1L")?.suggestedQty).toBe(10);
  });

  it("junta produtos por apelido", () => {
    const merged = buildProducts(receipts, { ...noPrefs, aliases: { "NESCAU 400G": "CAFE 500G" } });
    const cafe = merged.find((p) => p.key === "CAFE 500G")!;
    expect(cafe.sources.map((s) => s.key)).toEqual(["CAFE 500G", "NESCAU 400G"]);
    expect(cafe.times).toBe(3);
  });

  it("usa o EAN para casar o mesmo produto em mercados diferentes", () => {
    const ean = "7891000100103";
    const r = [
      receipt("x", "2026-09-01T10:00:00", [["LEITE NINHO 380G", 1, 18, ean]]),
      receipt("y", "2026-10-01T10:00:00", [["LT PO NINHO INTEGRAL 380G", 1, 19, ean]]),
    ];
    expect(buildProducts(r, noPrefs)).toHaveLength(1);
  });
});

describe("textos", () => {
  it("valida EAN", () => {
    expect(isGtin("7891000100103")).toBe(true);
    expect(isGtin("7891000100104")).toBe(false);
    expect(isGtin("2041")).toBe(false);
    expect(itemKey({ name: "Banana  prata kg", code: "2041" })).toBe("BANANA PRATA KG");
  });

  it("deixa nomes bonitos", () => {
    expect(prettyName("LEITE UHT ITALAC INTEGRAL 1L")).toBe("Leite UHT Italac Integral 1L");
    expect(prettyName("OVOS BRANCOS GRANDES C/12")).toBe("Ovos Brancos Grandes c/12");
    expect(prettyStore("SUPERMERCADOS ALVORADA S.A.")).toBe("Supermercados Alvorada");
    expect(prettyStore("MERCADO BOA ESCOLHA LTDA")).toBe("Mercado Boa Escolha");
  });

  it("categoriza produtos comuns", () => {
    expect(categorize("LEITE UHT ITALAC INTEGRAL 1L")).toBe("laticinios");
    expect(categorize("LEITE CONDENSADO MOCOCA")).toBe("mercearia");
    expect(categorize("REFRIG COCA COLA 2L")).toBe("bebidas");
    expect(categorize("AGUA SANITARIA QBOA 1L")).toBe("limpeza");
    expect(categorize("MACARRAO ESPAGUETE RENATA")).toBe("mercearia");
    expect(categorize("MACA GALA")).toBe("hortifruti");
    expect(categorize("SALSICHA PERDIGAO")).toBe("carnes");
    expect(categorize("PAPEL HIG NEVE 12UN")).toBe("higiene");
    expect(categorize("QJO MUSSARELA FATIADO")).toBe("laticinios");
    expect(categorize("PAO FRANCES")).toBe("padaria");
  });
});

describe("categorias com abreviações de uma nota real (Assaí)", () => {
  const expected: Record<string, string[]> = {
    hortifruti: ["ALHO A GRANEL kg", "CEBOLA NAC kg", "UVA BRANCA BJ 500G"],
    laticinios: [
      "CR LEITE ITALAC 200G", "LTE DESN PARMALAT 1L", "MARG QUALY 1kg C/S", "QJ MUSS VALE ITA FT",
      "QJ PROC SUPREMO 400G", "REQ POCOS 400G TRAD", "L PO ITALAC INT 400G",
    ],
    mercearia: [
      "DOCE LTE ITAMBE 350G", "ARROZ SOLITO 1kg", "ATUM P GC 500G", "FEIJ CAR CAMIL 1kg", "MAC DB 500G SPAG",
      "MAIONESE HEMMER 930G", "MB APTI 400G CHOC", "MB APTI 400G COCO", "MILHO PIP CBELO 2kg", "AZ OLIV SERRA 500ML",
      "EXT FUGINI 190G SACH", "F T ORIG GLOBO 1kg", "FLOCAO MARATA 500G", "M LAC MOCOCA TP 395G", "PALHA TOSTY 400G",
      "FILTRO AROMA MAX 103",
    ],
    padaria: ["PAO FRANC COST LAVOS0", "PAO QJO TRAD CLAV kg", "PAO HAMB WICKBOLD", "PAO DE ALHO SANTA MASSA"],
    limpeza: ["DET YPE 500ML COCO", "ESPONJA EXTREMA L4P3", "PANO ABS FLASH C/25", "ESP ESFR NAO RISC/3", "TOALHA ECONOBOM 2RL"],
    higiene: [
      "AXE 152ML URBAN", "CD COLG PRO A 90G OR", "CR DOVE 500G CACHOS", "CR SENSODYNE 90G EXT", "DEO AXE 152ML MUSK",
      "PH NEVE FT LV12 PG11", "SERUM TRES 110ML MOL",
    ],
    bebidas: ["REF CLIGHT 8G ABACAX", "REF CLIGHT 8G LARANJ", "REF CLIGHT 8G PINK L", "TANG LARANJA 25G"],
  };

  for (const [category, names] of Object.entries(expected)) {
    it(`reconhece ${category}`, () => {
      expect(names.map((n) => [n, categorize(n)])).toEqual(names.map((n) => [n, category]));
    });
  }

  it("não confunde palavras parecidas", () => {
    expect(categorize("TANGERINA PONKAN KG")).toBe("hortifruti");
    expect(categorize("LTE COND MOCOCA 395G")).toBe("mercearia");
    expect(categorize("COND SEDA CERAMIDAS")).toBe("higiene");
    expect(categorize("SAB PO OMO 1,6KG")).toBe("limpeza");
    expect(categorize("SAB DOVE ORIGINAL 90G")).toBe("higiene");
    expect(categorize("BAT PALHA YOKI 120G")).toBe("mercearia");
    expect(categorize("CAFE ESP PILAO 250G")).toBe("mercearia");
  });
});

describe("dados de exemplo", () => {
  it("geram 6 meses de notas com produtos recorrentes", () => {
    const demo = generateDemoReceipts();
    const months = monthsWithData(demo);
    expect(months).toHaveLength(6);
    const products = buildProducts(demo, noPrefs);
    expect(recurringProducts(products, months).length).toBeGreaterThan(20);
    expect(new Set(demo.map((r) => r.accessKey)).size).toBe(demo.length);
    expect(demo.every((r) => r.accessKey?.length === 44)).toBe(true);
  });
});
