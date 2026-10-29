"use client";

import { ArrowLeftRight, ChartColumn, Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductRow } from "@/components/ProductRow";
import { Screen } from "@/components/Screen";
import { Sheet } from "@/components/Sheet";
import { Card, CategoryIcon, Chips, Delta, Empty, List, Pill, Row, Section, cn } from "@/components/ui";
import { avgPrice, categoryTotals, compareMonths, monthSummaries, personalInflation, type CompareStatus } from "@/lib/analytics";
import { CATEGORIES } from "@/lib/categories";
import { formatQty, money, monthLower, monthName, monthShort } from "@/lib/format";
import { useData } from "@/lib/store";

type Filter = "all" | CompareStatus;

export default function ComparePage() {
  const { receipts, products, months } = useData();
  const [target, setTarget] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [picking, setPicking] = useState<null | "base" | "target">(null);
  const [filter, setFilter] = useState<Filter>("all");

  const t = target && months.includes(target) ? target : months[0];
  const b = base && months.includes(base) ? base : (months.find((m) => m < t) ?? months[1]);

  const summaries = useMemo(() => monthSummaries(receipts), [receipts]);
  const rows = useMemo(() => (t && b ? compareMonths(products, b, t) : []), [products, b, t]);
  const inflation = useMemo(() => (t && b ? personalInflation(products, b, t) : null), [products, b, t]);
  const cats = useMemo(() => {
    if (!t || !b) return [];
    const now = new Map(categoryTotals(products, t).map((c) => [c.category, c.spent]));
    const before = new Map(categoryTotals(products, b).map((c) => [c.category, c.spent]));
    return [...new Set([...now.keys(), ...before.keys()])]
      .map((category) => ({ category, now: now.get(category) ?? 0, before: before.get(category) ?? 0 }))
      .sort((x, y) => y.now - x.now);
  }, [products, b, t]);

  if (months.length < 2 || !t || !b) {
    return (
      <Screen title="Comparar">
        <Empty
          icon={ChartColumn}
          title="Precisa de dois meses"
          text="Escaneie notas de pelo menos dois meses diferentes para comparar produto a produto."
        />
      </Screen>
    );
  }

  const totalNow = summaries.get(t)?.total ?? 0;
  const totalBefore = summaries.get(b)?.total ?? 0;
  const diff = totalNow - totalBefore;
  const count = (s: CompareStatus) => rows.filter((r) => r.status === s).length;
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <Screen title="Comparar">
      {/* Seletor de meses */}
      <div className="flex items-center gap-2">
        <MonthButton label="De" value={b} onClick={() => setPicking("base")} />
        <button
          type="button"
          aria-label="Inverter meses"
          onClick={() => {
            setBase(t);
            setTarget(b);
          }}
          className="pressable grid size-10 shrink-0 place-items-center rounded-full bg-fill text-label-2"
        >
          <ArrowLeftRight size={17} strokeWidth={2.3} />
        </button>
        <MonthButton label="Para" value={t} onClick={() => setPicking("target")} />
      </div>

      {/* Resumo */}
      <Card className="mt-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[13px] font-semibold text-label-2">{monthName(b)}</div>
            <div className="mt-1 text-[22px] font-bold tabular tracking-tight text-label-2">{money(totalBefore)}</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-label-2">{monthName(t)}</div>
            <div className="mt-1 text-[22px] font-bold tabular tracking-tight">{money(totalNow)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[14px] bg-fill px-3.5 py-2.5">
          <span className="text-[14px] text-label-2">Diferença</span>
          <span className="flex items-center gap-2">
            <span className={cn("text-[16px] font-bold tabular", diff > 0 ? "text-up" : diff < 0 ? "text-down" : "")}>
              {diff > 0 ? "+" : diff < 0 ? "−" : ""}
              {money(Math.abs(diff))}
            </span>
            {totalBefore > 0 && <Delta value={totalNow / totalBefore - 1} pill />}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-[14px] bg-fill px-3.5 py-2.5">
          <span className="text-[14px] text-label-2">Sua inflação (mesmos produtos)</span>
          {inflation != null ? <Delta value={inflation} pill /> : <span className="text-label-3">—</span>}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { label: "subiram", value: count("up"), cls: "text-up" },
            { label: "baixaram", value: count("down"), cls: "text-down" },
            { label: "novos", value: count("new"), cls: "" },
            { label: "saíram", value: count("gone"), cls: "text-label-2" },
          ].map((s) => (
            <div key={s.label}>
              <div className={cn("text-[22px] font-bold tabular", s.cls)}>{s.value}</div>
              <div className="text-[12px] font-medium text-label-2">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Section title="Por categoria">
        <List>
          {cats.map((c) => (
            <Row
              key={c.category}
              icon={<CategoryIcon category={c.category} size={30} />}
              title={CATEGORIES[c.category].label}
              subtitle={`${monthShort(b)} ${money(c.before)} → ${monthShort(t)} ${money(c.now)}`}
              value={c.before > 0 && c.now > 0 ? <Delta value={c.now / c.before - 1} className="text-[14px]" /> : c.now > 0 ? <Pill tone="solid">novo</Pill> : <Pill>saiu</Pill>}
            />
          ))}
        </List>
      </Section>

      <Section title="Produto a produto">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todos", count: rows.length },
            { value: "up", label: "Subiram", count: count("up") },
            { value: "down", label: "Baixaram", count: count("down") },
            { value: "new", label: "Novos", count: count("new") },
            { value: "gone", label: "Saíram", count: count("gone") },
            { value: "same", label: "Iguais", count: count("same") },
          ]}
        />
        <div className="mt-3">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-label-2">Nenhum produto aqui.</p>
          ) : (
            <List>
              {visible.map((r) => {
                const p = r.product;
                const unit = p.unit;
                let subtitle: string;
                if (r.base && r.target) {
                  subtitle = `${money(avgPrice(r.base))} → ${money(avgPrice(r.target))} · ${formatQty(r.base.qty, unit)} → ${formatQty(r.target.qty, unit)}`;
                } else if (r.target) {
                  subtitle = `${formatQty(r.target.qty, unit)} em ${monthLower(t)}`;
                } else {
                  subtitle = `${formatQty(r.base!.qty, unit)} em ${monthLower(b)}`;
                }
                return (
                  <ProductRow
                    key={p.key}
                    product={p}
                    subtitle={subtitle}
                    value={
                      r.status === "new" ? (
                        <Pill tone="solid">novo</Pill>
                      ) : r.status === "gone" ? (
                        <Pill>saiu</Pill>
                      ) : (
                        <Delta value={r.priceChange} className="text-[14px]" />
                      )
                    }
                    valueSub={
                      <span className={cn("tabular", r.spentChange > 0 ? "text-label-2" : "text-label-3")}>
                        {r.spentChange >= 0 ? "+" : "−"}
                        {money(Math.abs(r.spentChange))}
                      </span>
                    }
                  />
                );
              })}
            </List>
          )}
        </div>
        <p className="mt-2 px-4 text-[13px] leading-snug text-label-2">
          A seta mostra a variação do preço médio por unidade. Embaixo, quanto você gastou a mais ou a menos com o produto.
        </p>
      </Section>

      <Sheet open={picking !== null} onClose={() => setPicking(null)} title={picking === "base" ? "Comparar de" : "Comparar com"}>
        <List>
          {months.map((m) => {
            const selected = (picking === "base" ? b : t) === m;
            const disabled = (picking === "base" ? t : b) === m;
            return (
              <Row
                key={m}
                title={<span className={cn(disabled && "text-label-3")}>{monthName(m, { year: true })}</span>}
                subtitle={`${summaries.get(m)?.receipts ?? 0} notas · ${money(summaries.get(m)?.total ?? 0)}`}
                onClick={
                  disabled
                    ? undefined
                    : () => {
                        if (picking === "base") setBase(m);
                        else setTarget(m);
                        setPicking(null);
                      }
                }
                trailing={selected ? <Check size={20} strokeWidth={2.6} /> : undefined}
              />
            );
          })}
        </List>
      </Sheet>
    </Screen>
  );
}

function MonthButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex h-14 min-w-0 flex-1 items-center justify-between rounded-[16px] bg-card px-3.5 text-left shadow-[var(--shadow)]"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-label-2">{label}</span>
        <span className="block truncate text-[16px] font-semibold">{monthName(value)}</span>
      </span>
      <ChevronDown size={17} className="shrink-0 text-label-3" strokeWidth={2.4} />
    </button>
  );
}
