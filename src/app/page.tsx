"use client";

import { ChartColumn, ChevronLeft, ChevronRight, ListChecks, ScanLine, Settings, ShoppingBasket, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BucketSheet, ChangeList } from "@/components/Breakdown";
import { MonthBars } from "@/components/charts";
import { LockedCard } from "@/components/Pro";
import { Screen } from "@/components/Screen";
import { BigMoney, Button, Card, Delta, IconButton, List, Row, Section, SectionLink, WidgetLabel, cn } from "@/components/ui";
import { monthBreakdown, monthSummaries, type Bucket } from "@/lib/analytics";
import {
  currentMonth,
  money,
  monthLower,
  monthName,
  monthOf,
  relativeDay,
  shiftMonth,
  signedMoney,
  todayLabel,
} from "@/lib/format";
import { prettyStore } from "@/lib/normalize";
import { FREE_MONTHS, usePro } from "@/lib/pro";
import { toast, useData, useMonth, useStore } from "@/lib/store";

export default function HomePage() {
  const data = useData();
  if (!data.receipts.length) return <Welcome />;
  return <Dashboard {...data} />;
}

function Dashboard({ receipts, products, months }: ReturnType<typeof useData>) {
  const [month, setMonth] = useMonth(months);
  const [open, setOpen] = useState<Bucket | null>(null);
  const pro = usePro();
  const locked = pro.isLocked(month);
  const prev = shiftMonth(month, -1);
  const reportYear = months[0].slice(0, 4);

  const summaries = useMemo(() => monthSummaries(receipts), [receipts]);
  const total = summaries.get(month)?.total ?? 0;
  // Mês em andamento: compara com o mesmo período do mês anterior
  const cutoff = month === currentMonth() ? new Date().getDate() : undefined;
  const hasPrev = summaries.has(prev);
  const breakdown = useMemo(
    () => (hasPrev ? monthBreakdown(receipts, products, prev, month, cutoff) : null),
    [hasPrev, receipts, products, prev, month, cutoff],
  );
  const diff = breakdown ? breakdown.targetTotal - breakdown.baseTotal : 0;

  const latest = months[0];
  const windowEnd = month < shiftMonth(latest, -5) ? shiftMonth(month, 5) : latest;
  const bars = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(windowEnd, i - 5);
    return { month: m, value: summaries.get(m)?.total ?? 0 };
  });

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

      {locked && (
        <LockedCard
          title={`${monthName(month)} está no Pro`}
          text={`No grátis você vê os últimos ${FREE_MONTHS} meses. As notas antigas continuam salvas.`}
          className="mb-3"
        />
      )}

      {!locked && (
      <Card>
        <WidgetLabel icon={ShoppingBasket}>Gasto em {monthLower(month)}</WidgetLabel>
        <div className="mt-2">
          <BigMoney value={total} />
        </div>
        <div className="mt-2 flex min-h-[24px] flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
          {breakdown && breakdown.baseTotal > 0 ? (
            <>
              <Delta value={breakdown.targetTotal / breakdown.baseTotal - 1} pill />
              <span className="text-label-2">
                {signedMoney(diff)} vs. {monthLower(prev)}
                {cutoff ? ` até dia ${cutoff}` : ""}
              </span>
            </>
          ) : (
            <span className="text-label-2">Sem notas em {monthLower(prev)} para comparar</span>
          )}
        </div>
        <div className="mt-5">
          <MonthBars data={bars} selected={month} onSelect={setMonth} isLocked={pro.isLocked} />
        </div>
      </Card>
      )}

      {locked && (
        <Card>
          <MonthBars data={bars} selected={month} onSelect={setMonth} isLocked={pro.isLocked} />
        </Card>
      )}

      {!locked && breakdown && breakdown.baseTotal > 0 && (
        <Section
          title="O que mudou"
          footer={`Somando as linhas, dá a diferença de ${signedMoney(diff)}. Toque numa linha para ver os produtos.`}
        >
          <ChangeList breakdown={breakdown} onOpen={setOpen} />
        </Section>
      )}

      <Link
        href="/relatorio"
        className="pressable mt-8 flex items-center gap-3.5 rounded-[24px] bg-[linear-gradient(135deg,#1c1c1e_0%,#3a1d2e_100%)] p-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#FF9500,#FF2D55)]">
          <Sparkles size={21} strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">Seu {reportYear} no mercado</div>
          <div className="text-[14px] text-white/60">Mês mais caro, produto campeão e mais</div>
        </div>
        <ChevronRight size={18} strokeWidth={2.4} className="text-white/40" />
      </Link>

      {!locked && (
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
      )}

      {breakdown && <BucketSheet breakdown={breakdown} bucket={open} onClose={() => setOpen(null)} />}
    </Screen>
  );
}

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
          { icon: ChartColumn, title: "Entenda o que mudou", text: "Quanto foi preço, quanto foi quantidade, produto a produto." },
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
