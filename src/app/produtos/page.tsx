"use client";

import { Package } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductRow } from "@/components/ProductRow";
import { Screen } from "@/components/Screen";
import { Empty, List, MoneyChange, Pill, SearchField, Section, Segmented } from "@/components/ui";
import { avgPrice, lastPricing, monthBreakdown, type Product } from "@/lib/analytics";
import { currentMonth, formatQty, money, monthLower, monthName, shiftMonth, unitLabel } from "@/lib/format";
import { normalizeText } from "@/lib/normalize";
import { perLabel } from "@/lib/size";
import { useData, useMonth } from "@/lib/store";

type Tab = "mes" | "todos";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("mes");
  const [query, setQuery] = useState("");
  const { receipts, products, months } = useData();
  const [month] = useMonth(months);
  const prev = shiftMonth(month, -1);
  const hasPrev = months.includes(prev);
  const cutoff = month === currentMonth() ? new Date().getDate() : undefined;

  const breakdown = useMemo(
    () => monthBreakdown(receipts, products, prev, month, cutoff),
    [receipts, products, prev, month, cutoff],
  );

  const q = normalizeText(query);
  const matches = (p: Product) =>
    !q || normalizeText(`${p.name} ${p.sources.map((s) => s.name).join(" ")}`).includes(q);

  const bought = breakdown.rows
    .filter((r) => r.target && matches(r.product))
    .sort((a, b) => b.target!.spent - a.target!.spent);
  const gone = hasPrev ? breakdown.rows.filter((r) => r.kind === "gone" && matches(r.product)) : [];
  const all = products
    .filter(matches)
    .sort((a, b) => b.times - a.times || b.lastDate.localeCompare(a.lastDate));

  return (
    <Screen title="Produtos">
      <SearchField value={query} onChange={setQuery} placeholder="Buscar produto" />
      <Segmented
        className="mt-3"
        value={tab}
        onChange={setTab}
        options={[
          { value: "mes", label: monthName(month) },
          { value: "todos", label: "Todos" },
        ]}
      />

      {tab === "mes" ? (
        <>
          {hasPrev && (
            <p className="mt-4 px-1 text-[14px] leading-snug text-label-2">
              Quantidade × preço. Ao lado, a diferença para {monthLower(prev)}
              {cutoff ? ` (até dia ${cutoff})` : ""}.
            </p>
          )}
          <div className="mt-3">
            {bought.length === 0 ? (
              <Empty icon={Package} title={query ? "Nada encontrado" : "Sem compras neste mês"} />
            ) : (
              <List>
                {bought.map((r) => (
                  <ProductRow
                    key={r.product.key}
                    product={r.product}
                    subtitle={`${formatQty(r.target!.qty, r.product.unit)} × ${money(avgPrice(r.target!))}`}
                    value={money(r.target!.spent)}
                    valueSub={hasPrev ? r.kind === "new" ? <Pill tone="solid">novo</Pill> : <MoneyChange value={r.change} /> : undefined}
                  />
                ))}
              </List>
            )}
          </div>

          {gone.length > 0 && (
            <Section title={<span className="text-[17px]">Não comprou em {monthLower(month)}</span>} className="mt-7">
              <List>
                {gone.map((r) => (
                  <ProductRow
                    key={r.product.key}
                    product={r.product}
                    subtitle={`em ${monthLower(prev)}: ${formatQty(r.base!.qty, r.product.unit)} × ${money(avgPrice(r.base!))}`}
                    value={<span className="font-normal text-label-2">{money(r.base!.spent)}</span>}
                  />
                ))}
              </List>
            </Section>
          )}
        </>
      ) : (
        <div className="mt-4">
          {all.length === 0 ? (
            <Empty icon={Package} title="Nada encontrado" text="Tente outro nome." />
          ) : (
            <List>
              {all.map((p) => {
                const monthsCount = Object.keys(p.months).length;
                const pricing = lastPricing(p);
                return (
                  <ProductRow
                    key={p.key}
                    product={p}
                    subtitle={`${p.times}× · em ${monthsCount} ${monthsCount === 1 ? "mês" : "meses"}`}
                    value={`${money(p.lastPrice)}/${unitLabel(p.unit)}`}
                    valueSub={
                      pricing?.size ? (
                        <span className="text-label-2">
                          {money(pricing.value)}
                          {perLabel(pricing.base)}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </List>
          )}
        </div>
      )}
    </Screen>
  );
}
