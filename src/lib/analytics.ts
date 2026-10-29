import { categorize, type CategoryId } from "./categories";
import { isWeight, monthOf } from "./format";
import { itemKey, prettyName } from "./normalize";
import { familyKey, unitPricing, type UnitPricing } from "./size";
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

const dayOf = (iso: string) => Number(iso.slice(8, 10));

/** Compras de um produto num mês, opcionalmente só até um dia (para comparar meses em andamento). */
function statUntil(p: Product, month: string, maxDay?: number): MonthStat | undefined {
  if (maxDay == null) return p.months[month];
  let s: MonthStat | undefined;
  for (const x of p.purchases) {
    if (x.month !== month || dayOf(x.date) > maxDay) continue;
    s ??= { qty: 0, spent: 0, times: 0 };
    s.qty += x.qty;
    s.spent += x.total;
    s.times += 1;
  }
  return s;
}

export type ChangeRow = {
  product: Product;
  base?: MonthStat;
  target?: MonthStat;
  kind: "both" | "new" | "gone";
  /** quanto da diferença veio do preço: (preço novo − preço antigo) × quantidade nova */
  priceEffect: number;
  /** quanto veio da quantidade: (quantidade nova − antiga) × preço antigo */
  quantityEffect: number;
  /** gasto no mês − gasto no mês anterior (= preço + quantidade) */
  change: number;
};

export type Bucket = "price" | "quantity" | "added" | "removed";

export type Breakdown = {
  base: string;
  target: string;
  /** quando o mês está em andamento, compara só até este dia nos dois meses */
  cutoffDay?: number;
  baseTotal: number;
  targetTotal: number;
  price: number;
  quantity: number;
  added: number;
  removed: number;
  /** o que sobra para fechar a conta: diferença de descontos e arredondamentos */
  other: number;
  /** variação de preço só nos produtos comprados nos dois meses (0.03 = +3%) */
  priceRatio: number | null;
  rows: ChangeRow[];
};

/**
 * Explica a diferença de gasto entre dois meses em reais, separando:
 * preço (os mesmos produtos ficaram mais caros/baratos), quantidade (levou mais/menos),
 * produtos novos e produtos que deixou de comprar. As partes somam a diferença do total pago.
 */
export function monthBreakdown(
  receipts: Receipt[],
  products: Product[],
  base: string,
  target: string,
  cutoffDay?: number,
): Breakdown {
  const paid = (month: string) =>
    receipts
      .filter((r) => monthOf(r.issuedAt) === month && (cutoffDay == null || dayOf(r.issuedAt) <= cutoffDay))
      .reduce((s, r) => s + r.total, 0);

  const rows: ChangeRow[] = [];
  let price = 0;
  let quantity = 0;
  let added = 0;
  let removed = 0;
  let sameNow = 0;
  let sameBefore = 0;

  for (const product of products) {
    const a = statUntil(product, base, cutoffDay);
    const b = statUntil(product, target, cutoffDay);
    if (!a && !b) continue;
    if (a && b) {
      const pa = avgPrice(a);
      const pb = avgPrice(b);
      const priceEffect = (pb - pa) * b.qty;
      const quantityEffect = (b.qty - a.qty) * pa;
      price += priceEffect;
      quantity += quantityEffect;
      sameNow += b.spent;
      sameBefore += pa * b.qty;
      rows.push({ product, base: a, target: b, kind: "both", priceEffect, quantityEffect, change: b.spent - a.spent });
    } else if (b) {
      added += b.spent;
      rows.push({ product, target: b, kind: "new", priceEffect: 0, quantityEffect: 0, change: b.spent });
    } else if (a) {
      removed -= a.spent;
      rows.push({ product, base: a, kind: "gone", priceEffect: 0, quantityEffect: 0, change: -a.spent });
    }
  }

  const baseTotal = paid(base);
  const targetTotal = paid(target);
  return {
    base,
    target,
    cutoffDay,
    baseTotal,
    targetTotal,
    price,
    quantity,
    added,
    removed,
    other: targetTotal - baseTotal - (price + quantity + added + removed),
    priceRatio: sameBefore > 0 ? sameNow / sameBefore - 1 : null,
    rows: rows.sort((x, y) => Math.abs(y.change) - Math.abs(x.change)),
  };
}

/** Produtos que contribuem para cada parte da diferença, do maior para o menor efeito. */
export function bucketRows(b: Breakdown, bucket: Bucket) {
  const value = (r: ChangeRow) =>
    bucket === "price" ? r.priceEffect : bucket === "quantity" ? r.quantityEffect : r.change;
  const kind = bucket === "added" ? "new" : bucket === "removed" ? "gone" : "both";
  return b.rows
    .filter((r) => r.kind === kind && Math.abs(value(r)) >= 0.01)
    .map((r) => ({ row: r, value: value(r) }))
    .sort((x, y) => Math.abs(y.value) - Math.abs(x.value));
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

const lastRawName = (p: Product) => p.purchases[p.purchases.length - 1].rawName;

/** Preço por kg / litro / unidade da última compra (pelo tamanho escrito na nota). */
export function lastPricing(p: Product): UnitPricing | undefined {
  const last = p.purchases[p.purchases.length - 1];
  return unitPricing(last.rawName, p.unit, last.unitPrice);
}

/**
 * Outras embalagens/marcas do mesmo tipo de produto (mesma categoria e mesma base: kg, L ou un),
 * do mais barato para o mais caro por kg/L — inclui o próprio produto.
 */
export function packComparison(product: Product, products: Product[]) {
  const mine = lastPricing(product);
  if (!mine) return [];
  const family = familyKey(lastRawName(product));
  return products
    .filter((p) => p.category === product.category && familyKey(lastRawName(p)) === family)
    .map((p) => ({ product: p, pricing: lastPricing(p) }))
    .filter((x): x is { product: Product; pricing: UnitPricing } => x.pricing?.base === mine.base)
    .sort((a, b) => a.pricing.value - b.pricing.value);
}
