import { describe, expect, it } from "vitest";
import { buildProducts } from "./analytics";
import { yearReport, yearsWithData } from "./report";
import type { Receipt } from "./types";

const noPrefs = { aliases: {}, names: {}, categories: {} };

function receipt(id: string, issuedAt: string, store: string, items: [string, number, number, string?][]): Receipt {
  const list = items.map(([name, qty, unitPrice, unit]) => ({ name, qty, unitPrice, unit: unit ?? "UN", total: qty * unitPrice }));
  const total = list.reduce((s, i) => s + i.total, 0);
  return { id, issuedAt, items: list, subtotal: total, discount: 0, total, store: { name: store }, source: "demo", createdAt: issuedAt };
}

const receipts = [
  receipt("a", "2025-12-20T10:00:00", "Mercado A", [["LEITE UHT 1L", 30, 3]]),
  receipt("b", "2026-01-10T10:00:00", "Mercado A", [["LEITE UHT 1L", 12, 4], ["CAFE PILAO 500G", 1, 20], ["BANANA PRATA", 1.5, 6, "KG"]]),
  receipt("c", "2026-02-10T10:00:00", "Mercado B", [["LEITE UHT 1L", 12, 4.5], ["CAFE PILAO 500G", 2, 25]]),
  receipt("d", "2026-02-25T10:00:00", "Mercado A", [["LEITE UHT 1L", 6, 4.4], ["DETERG YPE 500ML", 2, 2.5]]),
];

describe("relatório do ano", () => {
  const products = buildProducts(receipts, noPrefs);
  const r = yearReport(receipts, products, "2026");

  it("conta só as notas do ano", () => {
    expect(yearsWithData(receipts)).toEqual(["2026", "2025"]);
    expect(r.receipts).toBe(3);
    expect(r.total).toBeCloseTo(48 + 20 + 9 + 54 + 50 + 26.4 + 5);
    expect(r.months).toHaveLength(12);
    expect(r.monthsCount).toBe(2);
    expect(r.storesCount).toBe(2);
  });

  it("acha mês mais caro e mais barato", () => {
    expect(r.topMonth?.month).toBe("2026-02");
    expect(r.lowMonth?.month).toBe("2026-01");
  });

  it("acha o produto campeão e soma em litros pelo tamanho da embalagem", () => {
    expect(r.champion?.product.key).toBe("LEITE UHT 1L");
    expect(r.champion?.times).toBe(3);
    expect(r.champion?.base).toBe("L");
    expect(r.champion?.amount).toBeCloseTo(30);
  });

  it("acha o que mais subiu no ano", () => {
    expect(r.biggestRise?.product.key).toBe("CAFE PILAO 500G");
    expect(r.biggestRise?.change).toBeCloseTo(0.25);
  });

  it("acha o mercado favorito e as categorias", () => {
    expect(r.favoriteStore?.name).toBe("Mercado A");
    expect(r.favoriteStore?.receipts).toBe(2);
    expect(r.categories[0].category).toBe("laticinios");
    expect(r.categories.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
  });

  it("calcula a variação de preço dos mesmos produtos no ano", () => {
    // fev com as quantidades de fev: leite 18 un (4,5 e 4,4) e café 2 × 25 contra jan (4 e 20)
    expect(r.priceChange?.from).toBe("2026-01");
    expect(r.priceChange?.to).toBe("2026-02");
    expect(r.priceChange?.ratio).toBeGreaterThan(0.1);
  });
});
