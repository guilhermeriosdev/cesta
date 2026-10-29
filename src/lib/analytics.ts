import { categorize, type CategoryId } from "./categories";
import { isWeight, monthOf } from "./format";
import { itemKey, prettyName } from "./normalize";
import type { Prefs, Receipt } from "./types";

export type Purchase = {
  receiptId: string;
  date: string;
  month: string;
  store: string;
  qty: number;
  unitPrice: number;
  total: number;
  rawName: string;
};

export type MonthStat = { qty: number; spent: number; times: number };

export type Product = {
  key: string;
  name: string;
  /** Chaves de origem que caem neste produto (ele mesmo + produtos juntados) */
  sources: { key: string; name: string }[];
  unit: string;
  category: CategoryId;
  purchases: Purchase[];
  months: Record<string, MonthStat>;
  totalSpent: number;
  totalQty: number;
  times: number;
  lastPrice: number;
  lastDate: string;
};

export const avgPrice = (m: MonthStat) => (m.qty > 0 ? m.spent / m.qty : 0);

export function resolveKey(key: string, aliases: Record<string, string>) {
  let k = key;
  const seen = new Set<string>();
  while (aliases[k] && !seen.has(k)) {
    seen.add(k);
    k = aliases[k];
  }
  return k;
}

export function buildProducts(receipts: Receipt[], prefs: Prefs): Product[] {
  const map = new Map<string, Product>();
  const sorted = [...receipts].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));

  for (const r of sorted) {
    const month = monthOf(r.issuedAt);
    for (const it of r.items) {
      const raw = itemKey(it);
      if (!raw) continue;
      const key = resolveKey(raw, prefs.aliases);
      let p = map.get(key);
      if (!p) {
        p = {
          key, name: "", sources: [], unit: it.unit, category: "outros", purchases: [], months: {},
          totalSpent: 0, totalQty: 0, times: 0, lastPrice: 0, lastDate: "",
        };
        map.set(key, p);
      }
      if (!p.sources.some((s) => s.key === raw)) p.sources.push({ key: raw, name: it.name });
      const unitPrice = it.qty > 0 ? it.total / it.qty : it.unitPrice;
      p.purchases.push({
        receiptId: r.id, date: r.issuedAt, month, store: r.store.name,
        qty: it.qty, unitPrice, total: it.total, rawName: it.name,
      });
      const m = (p.months[month] ??= { qty: 0, spent: 0, times: 0 });
      m.qty += it.qty;
      m.spent += it.total;
      m.times += 1;
      p.totalSpent += it.total;
      p.totalQty += it.qty;
      p.times += 1;
      p.lastPrice = unitPrice;
      p.lastDate = r.issuedAt;
      p.unit = it.unit;
    }
  }

  for (const p of map.values()) {
    const latest = p.purchases[p.purchases.length - 1].rawName;
    p.name = prefs.names[p.key] ?? prettyName(latest);
    p.category = prefs.categories[p.key] ?? categorize(latest);
  }
  return [...map.values()];
}

export type MonthSummary = { month: string; total: number; receipts: number; items: number };

export function monthSummaries(receipts: Receipt[]) {
  const map = new Map<string, MonthSummary>();
  for (const r of receipts) {
    const month = monthOf(r.issuedAt);
    const s = map.get(month) ?? { month, total: 0, receipts: 0, items: 0 };
    s.total += r.total;
    s.receipts += 1;
    s.items += r.items.length;
    map.set(month, s);
  }
  return map;
}

/** Meses com nota, do mais recente para o mais antigo */
export function monthsWithData(receipts: Receipt[]) {
  return [...new Set(receipts.map((r) => monthOf(r.issuedAt)))].sort().reverse();
}

export function categoryTotals(products: Product[], month: string) {
  const totals = new Map<CategoryId, number>();
  for (const p of products) {
    const m = p.months[month];
    if (m) totals.set(p.category, (totals.get(p.category) ?? 0) + m.spent);
  }
  return [...totals]
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent);
}

export type CompareStatus = "new" | "gone" | "up" | "down" | "same";

export type CompareRow = {
  product: Product;
  base?: MonthStat;
  target?: MonthStat;
  status: CompareStatus;
  /** variação do preço médio por unidade (0.1 = +10%) */
  priceChange: number | null;
  spentChange: number;
};

/** Compara o mês `target` com o mês `base`, produto a produto. */
export function compareMonths(products: Product[], base: string, target: string): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const product of products) {
    const a = product.months[base];
    const b = product.months[target];
    if (!a && !b) continue;
    let status: CompareStatus;
    let priceChange: number | null = null;
    if (!a) status = "new";
    else if (!b) status = "gone";
    else {
      const pa = avgPrice(a);
      priceChange = pa > 0 ? avgPrice(b) / pa - 1 : null;
      status = priceChange == null || Math.abs(priceChange) < 0.005 ? "same" : priceChange > 0 ? "up" : "down";
    }
    rows.push({ product, base: a, target: b, status, priceChange, spentChange: (b?.spent ?? 0) - (a?.spent ?? 0) });
  }
  return rows.sort((x, y) => Math.abs(y.spentChange) - Math.abs(x.spentChange));
}

/**
 * "Sua inflação": quanto a cesta de `target` custaria a mais (ou a menos)
 * em relação aos preços pagos em `base`, considerando só produtos comprados nos dois meses.
 */
export function personalInflation(products: Product[], base: string, target: string): number | null {
  let now = 0;
  let before = 0;
  for (const p of products) {
    const a = p.months[base];
    const b = p.months[target];
    if (!a || !b || a.qty <= 0 || b.qty <= 0) continue;
    now += b.spent;
    before += b.qty * avgPrice(a);
  }
  return before > 0 ? now / before - 1 : null;
}

export type TopSort = "times" | "qty" | "spent";

export function topProducts(products: Product[], sort: TopSort, month?: string) {
  const value = (p: Product) => {
    const src = month ? p.months[month] : { qty: p.totalQty, spent: p.totalSpent, times: p.times };
    if (!src) return 0;
    if (sort === "times") return src.times * 1000 + (month ? 0 : Object.keys(p.months).length * 100) + src.qty;
    return sort === "qty" ? src.qty : src.spent;
  };
  return products.filter((p) => !month || p.months[month]).sort((a, b) => value(b) - value(a));
}

export type Recurring = {
  product: Product;
  monthsCount: number;
  span: number;
  avgQty: number;
  suggestedQty: number;
};

/**
 * "Sempre compro": produtos que aparecem em pelo menos metade dos meses com nota
 * (no mínimo 2 meses diferentes) — a base da lista automática.
 */
export function recurringProducts(
  products: Product[],
  allMonths: string[],
  minMonths = Math.max(2, Math.ceil(allMonths.length / 2)),
): Recurring[] {
  return products
    .map((product) => {
      const monthsCount = Object.keys(product.months).length;
      const avgQty = product.totalQty / Math.max(1, monthsCount);
      const suggestedQty = isWeight(product.unit)
        ? Math.max(0.1, Math.round(avgQty * 10) / 10)
        : Math.max(1, Math.round(avgQty));
      return { product, monthsCount, span: allMonths.length, avgQty, suggestedQty };
    })
    .filter((r) => r.monthsCount >= minMonths)
    .sort((a, b) => b.monthsCount - a.monthsCount || b.product.times - a.product.times);
}

export function storeStats(product: Product) {
  const map = new Map<string, { store: string; spent: number; qty: number; times: number; last: string }>();
  for (const p of product.purchases) {
    const s = map.get(p.store) ?? { store: p.store, spent: 0, qty: 0, times: 0, last: p.date };
    s.spent += p.total;
    s.qty += p.qty;
    s.times += 1;
    s.last = p.date > s.last ? p.date : s.last;
    map.set(p.store, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, avg: s.qty > 0 ? s.spent / s.qty : 0 }))
    .sort((a, b) => a.avg - b.avg);
}
