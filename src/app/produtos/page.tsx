"use client";

import { Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ProductRow } from "@/components/ProductRow";
import { Screen } from "@/components/Screen";
import { Chips, Delta, Empty, List, Pill, SearchField, Segmented } from "@/components/ui";
import { avgPrice, topProducts, type Product, type TopSort } from "@/lib/analytics";
import { formatQty, money, monthLower, relativeDay, shiftMonth, unitLabel } from "@/lib/format";
import { normalizeText } from "@/lib/normalize";
import { useData, useMonth } from "@/lib/store";

type Tab = "todos" | "top" | "novos" | "sumiram";
const TABS: { value: Tab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "top", label: "Top" },
  { value: "novos", label: "Novos" },
  { value: "sumiram", label: "Sumiram" },
];

export default function ProductsPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}

function Products() {
  const params = useSearchParams();
  const initial = TABS.some((t) => t.value === params.get("aba")) ? (params.get("aba") as Tab) : "todos";
  const [tab, setTab] = useState<Tab>(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TopSort>("times");
  const { products, months } = useData();
  const [month] = useMonth(months);
  const prev = shiftMonth(month, -1);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return products;
    return products.filter((p) => normalizeText(`${p.name} ${p.sources.map((s) => s.name).join(" ")}`).includes(q));
  }, [products, query]);

  const list = useMemo(() => {
    switch (tab) {
      case "todos":
        return [...filtered].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
      case "top":
        return topProducts(filtered, sort);
      case "novos":
        return filtered.filter((p) => p.months[month] && !p.months[prev]).sort((a, b) => b.months[month].spent - a.months[month].spent);
      case "sumiram":
        return filtered.filter((p) => p.months[prev] && !p.months[month]).sort((a, b) => b.months[prev].spent - a.months[prev].spent);
    }
  }, [filtered, tab, sort, month, prev]);

  return (
    <Screen title="Produtos">
      <SearchField value={query} onChange={setQuery} placeholder="Buscar produto" />
      <Segmented className="mt-3" value={tab} onChange={setTab} options={TABS} />

      {tab === "top" && (
        <div className="mt-4">
          <Chips
            value={sort}
            onChange={setSort}
            options={[
              { value: "times", label: "Frequência" },
              { value: "qty", label: "Quantidade" },
              { value: "spent", label: "Gasto" },
            ]}
          />
        </div>
      )}

      {(tab === "novos" || tab === "sumiram") && (
        <p className="mt-4 px-1 text-[14px] leading-snug text-label-2">
          {tab === "novos"
            ? `Comprados em ${monthLower(month)}, mas não em ${monthLower(prev)}.`
            : `Comprados em ${monthLower(prev)}, mas não em ${monthLower(month)}.`}
        </p>
      )}

      <div className="mt-4">
        {list.length === 0 ? (
          <Empty
            icon={Package}
            title={query ? "Nada encontrado" : tab === "novos" ? "Nada novo" : tab === "sumiram" ? "Nada sumiu" : "Sem produtos"}
            text={query ? "Tente outro nome." : "Escaneie mais notas para ver essa lista."}
          />
        ) : (
          <List>
            {list.map((p, i) => (
              <Item key={p.key} product={p} tab={tab} sort={sort} rank={i + 1} month={month} prev={prev} />
            ))}
          </List>
        )}
      </div>
      {list.length > 0 && (
        <p className="mt-3 text-center text-[13px] text-label-3">
          {list.length} {list.length === 1 ? "produto" : "produtos"}
        </p>
      )}
    </Screen>
  );
}

function Item({
  product: p,
  tab,
  sort,
  rank,
  month,
  prev,
}: {
  product: Product;
  tab: Tab;
  sort: TopSort;
  rank: number;
  month: string;
  prev: string;
}) {
  const unit = unitLabel(p.unit);

  if (tab === "top") {
    const value = sort === "spent" ? money(p.totalSpent) : sort === "qty" ? formatQty(p.totalQty, p.unit) : `${p.times}×`;
    const monthsCount = Object.keys(p.months).length;
    return (
      <ProductRow
        product={p}
        leading={<span className="w-5 text-center text-[15px] font-bold text-label-3 tabular">{rank}</span>}
        subtitle={`${p.times} ${p.times === 1 ? "compra" : "compras"} · em ${monthsCount} ${monthsCount === 1 ? "mês" : "meses"}`}
        value={value}
      />
    );
  }

  if (tab === "novos") {
    const m = p.months[month];
    const firstTime = Object.keys(p.months).every((k) => k >= month);
    return (
      <ProductRow
        product={p}
        subtitle={`${formatQty(m.qty, p.unit)} · ${money(avgPrice(m))}/${unit}`}
        value={money(m.spent)}
        valueSub={firstTime ? <Pill tone="solid">1ª vez</Pill> : <Pill>voltou</Pill>}
      />
    );
  }

  if (tab === "sumiram") {
    const m = p.months[prev];
    return <ProductRow product={p} subtitle={`última compra: ${relativeDay(p.lastDate)}`} value={money(m.spent)} valueSub={<span className="text-label-2">{formatQty(m.qty, p.unit)}</span>} />;
  }

  const purchases = p.purchases;
  const previous = purchases.length > 1 ? purchases[purchases.length - 2].unitPrice : null;
  return (
    <ProductRow
      product={p}
      subtitle={`${relativeDay(p.lastDate)} · ${p.times}× no total`}
      value={`${money(p.lastPrice)}/${unit}`}
      valueSub={previous ? <Delta value={p.lastPrice / previous - 1} className="text-[13px]" /> : undefined}
    />
  );
}
