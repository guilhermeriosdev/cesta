"use client";

import { Share, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ProIcon } from "@/components/Pro";
import { cn } from "@/components/ui";
import { formatQty, money, monthName, percent } from "@/lib/format";
import { prettyStore } from "@/lib/normalize";
import { TRIAL_DAYS, usePro } from "@/lib/pro";
import { yearReport, yearsWithData, type YearReport } from "@/lib/report";
import { shareReport } from "@/lib/shareImage";
import { toast, useData, useStore } from "@/lib/store";

type Slide = { id: string; bg: string; glow: string; content: ReactNode };

export default function ReportPage() {
  const { receipts, products } = useData();
  const years = useMemo(() => yearsWithData(receipts), [receipts]);
  const [year, setYear] = useState<string | null>(null);
  const y = year && years.includes(year) ? year : years[0];
  const report = useMemo(() => (y ? yearReport(receipts, products, y) : null), [receipts, products, y]);

  if (!report) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black px-10 text-center text-white">
        <div>
          <p className="text-[19px] font-semibold">Ainda não há notas</p>
          <Link href="/" className="mt-4 inline-block text-white/70 underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }
  return <Stories report={report} years={years} onYear={setYear} />;
}

function Stories({ report: r, years, onYear }: { report: YearReport; years: string[]; onYear: (y: string) => void }) {
  const pro = usePro();
  const startTrial = useStore((s) => s.startTrial);
  const [i, setI] = useState(0);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    try {
      const how = await shareReport(r);
      if (how === "downloaded") toast("Imagem salva");
    } catch {
      // compartilhamento cancelado
    } finally {
      setSharing(false);
    }
  };

  const all = buildSlides(r, years, onYear, share, sharing);
  const paywall: Slide = {
    id: "pro",
    bg: "linear-gradient(160deg,#2c2c2e,#000)",
    glow: "rgba(255,45,85,0.45)",
    content: (
      <div className="flex flex-col items-center text-center">
        <ProIcon />
        <Big className="mt-7">Seu ano tem mais</Big>
        <p className="mt-3 max-w-[300px] text-[17px] leading-snug text-white/70">
          Mês mais caro, produto campeão, o que mais subiu, seu mercado favorito e a imagem para compartilhar.
        </p>
        <div className="relative z-20 mt-8 w-full max-w-[300px] space-y-2">
          {!pro.trialUsed && (
            <button
              type="button"
              onClick={() => {
                startTrial();
                toast(`Pro liberado por ${TRIAL_DAYS} dias`);
                setI(1);
              }}
              className="pressable h-[52px] w-full rounded-[16px] bg-white text-[17px] font-semibold text-black"
            >
              Testar {TRIAL_DAYS} dias grátis
            </button>
          )}
          <Link
            href="/pro"
            className={cn(
              "pressable flex h-[52px] w-full items-center justify-center rounded-[16px] text-[17px] font-semibold",
              pro.trialUsed ? "bg-white text-black" : "bg-white/15 text-white",
            )}
          >
            Conhecer o Pro
          </Link>
        </div>
      </div>
    ),
  };
  const slides = pro.isPro ? all : [all[0], paywall];
  const idx = Math.min(i, slides.length - 1);
  const slide = slides[idx];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-white" style={{ background: slide.bg }}>
      <div
        className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full blur-3xl transition-colors duration-700"
        style={{ background: slide.glow }}
      />

      {/* progresso */}
      <div
        className="absolute inset-x-0 top-0 z-30 mx-auto flex max-w-md gap-1 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        {slides.map((s, n) => (
          <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div className={cn("h-full rounded-full bg-white transition-all duration-300", n <= idx ? "w-full" : "w-0")} />
          </div>
        ))}
      </div>
      <Link
        href="/"
        aria-label="Fechar"
        className="pressable absolute right-4 z-30 grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-xl"
        style={{ top: "calc(env(safe-area-inset-top) + 24px)" }}
      >
        <X size={18} strokeWidth={2.5} />
      </Link>

      {/* toques: esquerda volta, direita avança */}
      <button
        type="button"
        aria-label="Anterior"
        className="absolute inset-y-0 left-0 z-10 w-1/3"
        onClick={() => setI(Math.max(0, idx - 1))}
      />
      <button
        type="button"
        aria-label="Próximo"
        className="absolute inset-y-0 right-0 z-10 w-2/3"
        onClick={() => setI(Math.min(slides.length - 1, idx + 1))}
      />

      <div
        key={slide.id}
        className="animate-in pointer-events-none relative z-20 mx-auto flex h-full max-w-md flex-col justify-center px-8 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
      >
        {slide.content}
      </div>
    </div>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-white/60">{children}</p>
);
const Big = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn("text-[40px] font-bold leading-[1.05] tracking-tight", className)}>{children}</h2>
);
const Sub = ({ children }: { children: ReactNode }) => <p className="mt-3 text-[18px] leading-snug text-white/70">{children}</p>;

function buildSlides(
  r: YearReport,
  years: string[],
  onYear: (y: string) => void,
  share: () => void,
  sharing: boolean,
): Slide[] {
  const slides: Slide[] = [];
  const nextYear = years[(years.indexOf(r.year) + 1) % years.length];

  slides.push({
    id: "capa",
    bg: "linear-gradient(160deg,#1c1c1e,#000)",
    glow: "rgba(52,199,89,0.35)",
    content: (
      <div>
        {years.length > 1 ? (
          <button type="button" onClick={() => onYear(nextYear)} className="relative z-20 rounded-full bg-white/15 px-3 py-1 text-[14px] font-semibold">
            {r.year} · trocar ano
          </button>
        ) : (
          <Eyebrow>Seu {r.year} no mercado</Eyebrow>
        )}
        <p className="mt-6 text-[20px] text-white/70">Você gastou</p>
        <p className="mt-1 text-[56px] font-bold leading-none tracking-tight tabular">{money(r.total)}</p>
        <Sub>
          em {r.receipts} {r.receipts === 1 ? "nota" : "notas"}, {r.storesCount} {r.storesCount === 1 ? "mercado" : "mercados"} e{" "}
          {r.monthsCount} {r.monthsCount === 1 ? "mês" : "meses"} — em média {money(r.avgMonth)} por mês.
        </Sub>
        <p className="mt-10 text-[14px] text-white/40">Toque para continuar</p>
      </div>
    ),
  });

  if (r.topMonth) {
    const max = Math.max(...r.months.map((m) => m.total), 1);
    slides.push({
      id: "meses",
      bg: "linear-gradient(160deg,#0b2545,#000)",
      glow: "rgba(0,122,255,0.4)",
      content: (
        <div>
          <Eyebrow>Seu mês mais caro</Eyebrow>
          <Big className="mt-3">{monthName(r.topMonth.month, { year: false })}</Big>
          <Sub>
            {money(r.topMonth.total)}
            {r.lowMonth ? ` — o mais leve foi ${monthName(r.lowMonth.month, { year: false }).toLowerCase()}, com ${money(r.lowMonth.total)}.` : "."}
          </Sub>
          <div className="mt-10 flex h-40 items-end gap-1.5">
            {r.months.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn("w-full rounded-[5px]", m.month === r.topMonth!.month ? "bg-white" : "bg-white/25")}
                  style={{ height: m.total > 0 ? Math.max(6, (m.total / max) * 140) : 3 }}
                />
                <span className="text-[10px] font-semibold text-white/50">{monthName(m.month, { year: false }).slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  if (r.champion) {
    const c = r.champion;
    const amount =
      c.base === "unit" ? `${formatQty(c.amount, "UN")}` : c.base === "kg" ? formatQty(c.amount, "KG") : `${formatQty(c.amount, "L")}`;
    slides.push({
      id: "campeao",
      bg: "linear-gradient(160deg,#3a1d00,#000)",
      glow: "rgba(255,149,0,0.45)",
      content: (
        <div>
          <Eyebrow>Seu produto campeão</Eyebrow>
          <Big className="mt-3">{c.product.name}</Big>
          <Sub>
            Comprado {c.times} vezes. No ano foram {amount} e {money(c.spent)}.
          </Sub>
        </div>
      ),
    });
  }

  if (r.categories.length) {
    const top = r.categories.slice(0, 4);
    slides.push({
      id: "categorias",
      bg: "linear-gradient(160deg,#1f1147,#000)",
      glow: "rgba(88,86,214,0.5)",
      content: (
        <div>
          <Eyebrow>Para onde foi o dinheiro</Eyebrow>
          <Big className="mt-3">{r.categories[0].label}</Big>
          <Sub>{Math.round(r.categories[0].share * 100)}% do que você gastou com produtos.</Sub>
          <div className="mt-9 space-y-3.5">
            {top.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-[15px] font-semibold">
                  <span>{c.label}</span>
                  <span className="tabular text-white/70">{money(c.spent)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(3, c.share * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  if (r.biggestRise || r.priceChange) {
    slides.push({
      id: "subiu",
      bg: "linear-gradient(160deg,#3d0a0a,#000)",
      glow: "rgba(255,59,48,0.45)",
      content: (
        <div>
          {r.biggestRise && (
            <>
              <Eyebrow>O que mais subiu</Eyebrow>
              <Big className="mt-3">{r.biggestRise.product.name}</Big>
              <Sub>
                De {money(r.biggestRise.from)} para {money(r.biggestRise.to)}:{" "}
                <span className="font-bold text-white">{percent(r.biggestRise.change, 0)}</span> no ano.
              </Sub>
            </>
          )}
          {r.priceChange && (
            <p className={cn("text-[18px] leading-snug text-white/70", r.biggestRise && "mt-10")}>
              No geral, os mesmos produtos ficaram{" "}
              <span className="font-bold text-white">{percent(r.priceChange.ratio)}</span>{" "}
              {r.priceChange.ratio >= 0 ? "mais caros" : "mais baratos"} entre {monthName(r.priceChange.from, { year: false }).toLowerCase()} e{" "}
              {monthName(r.priceChange.to, { year: false }).toLowerCase()}.
            </p>
          )}
        </div>
      ),
    });
  }

  if (r.favoriteStore) {
    slides.push({
      id: "mercado",
      bg: "linear-gradient(160deg,#04302b,#000)",
      glow: "rgba(0,199,190,0.4)",
      content: (
        <div>
          <Eyebrow>Seu mercado favorito</Eyebrow>
          <Big className="mt-3">{prettyStore(r.favoriteStore.name)}</Big>
          <Sub>
            {r.favoriteStore.receipts} {r.favoriteStore.receipts === 1 ? "ida" : "idas"} e {money(r.favoriteStore.spent)} no ano.
          </Sub>
        </div>
      ),
    });
  }

  slides.push({
    id: "fim",
    bg: "linear-gradient(160deg,#2c2c2e,#000)",
    glow: "rgba(255,45,85,0.4)",
    content: (
      <div className="text-center">
        <Eyebrow>Esse foi o seu {r.year}</Eyebrow>
        <p className="mt-4 text-[48px] font-bold leading-none tracking-tight tabular">{money(r.total)}</p>
        <Sub>Compartilhe o resumo do seu ano.</Sub>
        <button
          type="button"
          onClick={share}
          disabled={sharing}
          className="pressable relative z-20 mx-auto mt-8 flex h-[52px] w-full max-w-[280px] items-center justify-center gap-2 rounded-[16px] bg-white text-[17px] font-semibold text-black disabled:opacity-60"
        >
          <Share size={19} strokeWidth={2.3} /> {sharing ? "Gerando imagem…" : "Compartilhar"}
        </button>
        <Link href="/" className="relative z-20 mt-4 inline-block text-[15px] font-medium text-white/60">
          Fechar
        </Link>
      </div>
    ),
  });

  return slides;
}

