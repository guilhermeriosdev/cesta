import { monthBreakdown, type Product } from "./analytics";
import { CATEGORIES, type CategoryId } from "./categories";
import { monthOf } from "./format";
import { packSize, type Base } from "./size";
import type { Receipt } from "./types";

export type YearReport = {
  year: string;
  total: number;
  receipts: number;
  monthsCount: number;
  avgMonth: number;
  storesCount: number;
  /** os 12 meses do ano, com 0 nos meses sem nota */
  months: { month: string; total: number }[];
  topMonth?: { month: string; total: number };
  lowMonth?: { month: string; total: number };
  champion?: { product: Product; times: number; spent: number; amount: number; base: Base | "unit" };
  categories: { category: CategoryId; label: string; spent: number; share: number }[];
  biggestRise?: { product: Product; from: number; to: number; change: number };
  favoriteStore?: { name: string; receipts: number; spent: number };
  /** variação de preço dos mesmos produtos entre o primeiro e o último mês do ano */
  priceChange?: { from: string; to: string; ratio: number };
};

export function yearsWithData(receipts: Receipt[]) {
  return [...new Set(receipts.map((r) => r.issuedAt.slice(0, 4)))].sort().reverse();
}

export function yearReport(receipts: Receipt[], products: Product[], year: string): YearReport {
  const inYear = receipts.filter((r) => r.issuedAt.startsWith(year));
  const total = inYear.reduce((s, r) => s + r.total, 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month, total: inYear.filter((r) => monthOf(r.issuedAt) === month).reduce((s, r) => s + r.total, 0) };
  });
  const withData = months.filter((m) => m.total > 0);
  const byTotal = [...withData].sort((a, b) => b.total - a.total);

  // Produto campeão: mais vezes comprado no ano (desempate pelo gasto)
  let champion: YearReport["champion"];
  let biggestRise: YearReport["biggestRise"];
  const catTotals = new Map<CategoryId, number>();
  for (const product of products) {
    const ps = product.purchases.filter((x) => x.date.startsWith(year));
    if (!ps.length) continue;
    const spent = ps.reduce((s, x) => s + x.total, 0);
    catTotals.set(product.category, (catTotals.get(product.category) ?? 0) + spent);

    if (!champion || ps.length > champion.times || (ps.length === champion.times && spent > champion.spent)) {
      // Quantidade total em kg/L quando dá para saber o tamanho da embalagem
      let amount = 0;
      let base: Base | "unit" = "unit";
      for (const x of ps) {
        const unit = product.unit.toUpperCase();
        if (unit === "KG") {
          amount += x.qty;
          base = "kg";
        } else {
          const size = packSize(x.rawName);
          if (size && size.base !== "un") {
            amount += x.qty * size.amount;
            base = size.base;
          } else {
            amount += x.qty;
          }
        }
      }
      champion = { product, times: ps.length, spent, amount, base };
    }

    const first = ps[0];
    const last = ps[ps.length - 1];
    if (ps.length >= 2 && first.month !== last.month && first.unitPrice >= 1) {
      const change = last.unitPrice / first.unitPrice - 1;
      if (change > 0.005 && (!biggestRise || change > biggestRise.change)) {
        biggestRise = { product, from: first.unitPrice, to: last.unitPrice, change };
      }
    }
  }

  const itemsTotal = [...catTotals.values()].reduce((s, v) => s + v, 0) || 1;
  const categories = [...catTotals]
    .map(([category, spent]) => ({ category, label: CATEGORIES[category].label, spent, share: spent / itemsTotal }))
    .sort((a, b) => b.spent - a.spent);

  const stores = new Map<string, { name: string; receipts: number; spent: number }>();
  for (const r of inYear) {
    const s = stores.get(r.store.name) ?? { name: r.store.name, receipts: 0, spent: 0 };
    s.receipts += 1;
    s.spent += r.total;
    stores.set(r.store.name, s);
  }
  const favoriteStore = [...stores.values()].sort((a, b) => b.receipts - a.receipts || b.spent - a.spent)[0];

  let priceChange: YearReport["priceChange"];
  if (withData.length >= 2) {
    const from = withData[0].month;
    const to = withData[withData.length - 1].month;
    const ratio = monthBreakdown(receipts, products, from, to).priceRatio;
    if (ratio != null) priceChange = { from, to, ratio };
  }

  return {
    year,
    total,
    receipts: inYear.length,
    monthsCount: withData.length,
    avgMonth: withData.length ? total / withData.length : 0,
    storesCount: stores.size,
    months,
    topMonth: byTotal[0],
    lowMonth: byTotal.length > 1 ? byTotal[byTotal.length - 1] : undefined,
    champion,
    categories,
    biggestRise,
    favoriteStore,
    priceChange,
  };
}
