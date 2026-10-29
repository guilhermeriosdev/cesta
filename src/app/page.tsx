"use client";

import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Receipt,
  ScanLine,
  Settings,
  ShoppingBasket,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CategoryBar, MonthBars } from "@/components/charts";
import { ProductRow } from "@/components/ProductRow";
import { Screen } from "@/components/Screen";
import { BigMoney, Button, Card, Delta, IconButton, List, Row, Section, SectionLink, WidgetLabel, cn } from "@/components/ui";
import {
  categoryTotals,
  compareMonths,
  monthSummaries,
  personalInflation,
  recurringProducts,
  topProducts,
} from "@/lib/analytics";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import {
  currentMonth,
  formatQty,
  money,
  monthLower,
  monthName,
  monthOf,
  monthShort,
  parseLocal,
  relativeDay,
  shiftMonth,
  todayLabel,
} from "@/lib/format";
import { prettyStore } from "@/lib/normalize";
import { toast, useData, useMonth, useStore } from "@/lib/store";

export default function HomePage() {
  const data = useData();
  if (!data.receipts.length) return <Welcome />;
  return <Dashboard {...data} />;
}

function Dashboard({ receipts, products, months }: ReturnType<typeof useData>) {
  const [month, setMonth] = useMonth(months);
  const shopping = useStore((s) => s.shopping);
  const prev = shiftMonth(month, -1);

  const summaries = useMemo(() => monthSummaries(receipts), [receipts]);
  const cur = summaries.get(month);
  const before = summaries.get(prev);
  const total = cur?.total ?? 0;

  // Mês em andamento: compara com o mesmo período do mês anterior
  const partial = month === currentMonth();
  const today = new Date().getDate();
  const beforeTotal = partial
    ? receipts
        .filter((r) => monthOf(r.issuedAt) === prev && parseLocal(r.issuedAt).getDate() <= today)
        .reduce((s, r) => s + r.total, 0)
    : (before?.total ?? 0);
  const change = before && beforeTotal > 0 ? total / beforeTotal - 1 : null;

  const latest = months[0];
  const windowEnd = month < shiftMonth(latest, -5) ? shiftMonth(month, 5) : latest;
  const bars = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(windowEnd, i - 5);
    return { month: m, value: summaries.get(m)?.total ?? 0 };
  });

  const inflation = useMemo(() => personalInflation(products, prev, month), [products, prev, month]);
  const categories = useMemo(() => categoryTotals(products, month), [products, month]);
  const top = useMemo(() => topProducts(products, "times", month).slice(0, 3), [products, month]);
  const newOnes = useMemo(
    () => (before ? compareMonths(products, prev, month).filter((r) => r.status === "new") : []),
    [products, prev, month, before],
  );
  const recurring = useMemo(() => recurringProducts(products, months), [products, months]);
  const pending = shopping.filter((i) => !i.checked).length;
  const monthReceipts = receipts
    .filter((r) => monthOf(r.issuedAt) === month)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  const idx = months.indexOf(month);
  const older = months[idx + 1];
  const newer = idx > 0 ? months[idx - 1] : undefined;

  return (
    <Screen
      title="Resumo"
      eyebrow={todayLabel()}
      right={
        <IconButton href="/ajustes" label="Ajustes">
          <Settings size={18} strokeWidth={2.2} />
        </IconButton>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <IconButton label="Mês anterior" onClick={() => older && setMonth(older)} className={cn(!older && "invisible")}>
          <ChevronLeft size={18} strokeWidth={2.4} />
        </IconButton>
        <div className="text-[15px] font-semibold">{monthName(month, { year: true })}</div>
        <IconButton label="Próximo mês" onClick={() => newer && setMonth(newer)} className={cn(!newer && "invisible")}>
          <ChevronRight size={18} strokeWidth={2.4} />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total do mês */}
        <Card className="col-span-2">
          <WidgetLabel icon={ShoppingBasket}>Gasto em {monthLower(month)}</WidgetLabel>
          <div className="mt-2">
            <BigMoney value={total} />
          </div>
          <div className="mt-2 flex min-h-[24px] flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
            {change != null ? (
              <>
                <Delta value={change} pill />
                <span className="text-label-2">
                  vs. {monthLower(prev)}
                  {partial ? ` até dia ${today}` : ""} · {money(beforeTotal)}
                </span>
              </>
            ) : (
              <span className="text-label-2">Sem notas em {monthLower(prev)} para comparar</span>
            )}
          </div>
          <div className="mt-5">
            <MonthBars data={bars} selected={month} onSelect={setMonth} />
          </div>
        </Card>

        {/* Notas */}
        <Card href="/notas">
          <WidgetLabel icon={Receipt}>Notas</WidgetLabel>
          <div className="mt-2 text-[34px] font-bold leading-none tracking-tight tabular">{cur?.receipts ?? 0}</div>
          <p className="mt-2 text-[13px] leading-snug text-label-2">
            {cur ? `ticket médio de ${money(total / cur.receipts)}` : "nenhuma neste mês"}
          </p>
        </Card>

        {/* Inflação pessoal */}
        <Card href="/comparar">
          <WidgetLabel icon={TrendingUp}>Sua inflação</WidgetLabel>
          <div className="mt-2 text-[34px] leading-none tracking-tight">
            {inflation != null ? <Delta value={inflation} className="font-bold" /> : <span className="font-bold text-label-3">—</span>}
          </div>
          <p className="mt-2 text-[13px] leading-snug text-label-2">
            {inflation != null ? `mesmos produtos vs. ${monthShort(prev)}` : "precisa de 2 meses seguidos"}
          </p>
        </Card>

        {/* Categorias */}
        {categories.length > 0 && (
          <Card className="col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <WidgetLabel icon={ChartColumn}>Por categoria</WidgetLabel>
              <span className="text-[13px] font-semibold text-label-2 tabular">{money(categories[0].spent)} em {categoryLabel(categories[0].category)}</span>
            </div>
            <CategoryBar data={categories} />
          </Card>
        )}

        {/* Lista */}
        <Card href="/lista">
          <WidgetLabel icon={ListChecks}>Lista</WidgetLabel>
          <div className="mt-2 text-[34px] font-bold leading-none tracking-tight tabular">{pending}</div>
          <p className="mt-2 text-[13px] leading-snug text-label-2">
            {pending ? "itens para comprar" : `${recurring.length} que você sempre compra`}
          </p>
        </Card>

        {/* Novidades */}
        <Card href="/comparar">
          <WidgetLabel icon={Sparkles}>Novidades</WidgetLabel>
          <div className="mt-2 text-[34px] font-bold leading-none tracking-tight tabular">{newOnes.length}</div>
          <p className="mt-2 truncate text-[13px] leading-snug text-label-2">
            {newOnes.length ? newOnes.map((r) => r.product.name).slice(0, 2).join(", ") : `nada novo vs. ${monthShort(prev)}`}
          </p>
        </Card>
      </div>

      {top.length > 0 && (
        <Section title="Mais comprados" action={<SectionLink href="/produtos?aba=top">Ver todos</SectionLink>}>
          <List>
            {top.map((p, i) => (
              <ProductRow
                key={p.key}
                product={p}
                leading={<span className="w-3 text-center text-[15px] font-bold text-label-3">{i + 1}</span>}
                subtitle={`${p.months[month].times}× em ${monthLower(month)} · ${formatQty(p.months[month].qty, p.unit)}`}
                value={money(p.months[month].spent)}
              />
            ))}
          </List>
        </Section>
      )}

      <Section title={`Notas de ${monthLower(month)}`} action={<SectionLink href="/notas">Ver todas</SectionLink>}>
        <List>
          {monthReceipts.slice(0, 4).map((r) => (
            <Row
              key={r.id}
              href={`/notas/${encodeURIComponent(r.id)}`}
              icon={
                <div className="grid size-[34px] place-items-center rounded-[10px] bg-fill text-label-2">
                  <Store size={17} strokeWidth={2.1} />
                </div>
              }
              title={prettyStore(r.store.name)}
              subtitle={`${relativeDay(r.issuedAt)} · ${r.items.length} itens`}
              value={money(r.total)}
              chevron
            />
          ))}
        </List>
      </Section>
    </Screen>
  );
}

const categoryLabel = (c: CategoryId) => CATEGORIES[c].label.toLowerCase();

function Welcome() {
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="animate-in flex min-h-dvh flex-col px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 48px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
      <div className="grid size-[76px] place-items-center rounded-[22px] bg-label text-bg shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        <ShoppingBasket size={38} strokeWidth={1.9} />
      </div>
      <h1 className="mt-7 text-[34px] font-bold leading-[1.1] tracking-tight">
        Seu mercado,
        <br />
        mês a mês.
      </h1>
      <p className="mt-3 text-[17px] leading-snug text-label-2">
        Escaneie o QR Code da nota fiscal e veja quanto você gasta, o que subiu de preço e o que você sempre compra.
      </p>

      <div className="mt-9 space-y-5">
        {[
          { icon: ScanLine, title: "Leia a nota em segundos", text: "Os itens vêm direto da SEFAZ, sem digitar nada." },
          { icon: ChartColumn, title: "Compare os meses", text: "Total, produto a produto e a sua inflação pessoal." },
          { icon: ListChecks, title: "Lista automática", text: "O que aparece todo mês vira sua lista de sempre." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-card text-label shadow-[var(--shadow)]">
              <Icon size={21} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[16px] font-semibold">{title}</div>
              <div className="text-[15px] leading-snug text-label-2">{text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-2.5 pt-10">
        <Link href="/escanear" className="pressable flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-label text-[17px] font-semibold text-bg">
          <ScanLine size={20} strokeWidth={2.3} />
          Escanear primeira nota
        </Link>
        <Button
          variant="secondary"
          onClick={() => {
            loadDemo();
            toast("Dados de exemplo carregados");
          }}
        >
          Explorar com dados de exemplo
        </Button>
      </div>
    </div>
  );
}
