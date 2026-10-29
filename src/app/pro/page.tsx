"use client";

import { Calendar, Check, ChartColumn, Cloud, Scale, Target, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProIcon } from "@/components/Pro";
import { Screen } from "@/components/Screen";
import { Button, Pill, cn } from "@/components/ui";
import { money } from "@/lib/format";
import { FREE_MONTHS, PRICES, TRIAL_DAYS, usePro } from "@/lib/pro";
import { toast, useStore } from "@/lib/store";

const FEATURES: { icon: LucideIcon; color: string; title: string; text: string; soon?: boolean }[] = [
  {
    icon: Calendar,
    color: "#007AFF",
    title: "Histórico completo",
    text: `Todos os meses e notas, não só os últimos ${FREE_MONTHS}.`,
  },
  {
    icon: ChartColumn,
    color: "#FF2D55",
    title: "Relatório do ano",
    text: "Mês mais caro, produto campeão, o que mais subiu e onde você mais comprou.",
  },
  {
    icon: Scale,
    color: "#FF9500",
    title: "Melhor embalagem",
    text: "Compara marcas e tamanhos por kg ou litro e mostra qual sai mais barato.",
  },
  { icon: Cloud, color: "#5856D6", title: "Backup e sincronização", text: "Suas notas em todos os aparelhos.", soon: true },
  { icon: Users, color: "#34C759", title: "Plano Família", text: "A casa toda com as mesmas notas e lista.", soon: true },
  { icon: Target, color: "#00C7BE", title: "Orçamento e alertas", text: "Meta do mês e aviso quando um preço sobe.", soon: true },
];

type Period = "yearly" | "monthly";

export default function ProPage() {
  const router = useRouter();
  const pro = usePro();
  const startTrial = useStore((s) => s.startTrial);
  const [period, setPeriod] = useState<Period>("yearly");
  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  return (
    <Screen title="Cesta Pro" back={{ label: "Voltar" }} large={false}>
      <div className="flex flex-col items-center pt-4 text-center">
        <ProIcon />
        <h1 className="mt-5 text-[30px] font-bold leading-tight tracking-tight">Cesta Pro</h1>
        <p className="mt-2 max-w-[300px] text-[16px] leading-snug text-label-2">
          Entenda cada centavo do seu mercado — mês a mês e no ano inteiro.
        </p>
        {pro.isPro && (
          <div className="mt-4">
            <Pill tone="down">
              {pro.paid ? "Pro ativo" : `Teste grátis até ${pro.trialEndsAt ? fmtDate(pro.trialEndsAt) : ""}`}
            </Pill>
          </div>
        )}
      </div>

      <div className="mt-7 space-y-4 px-1">
        {FEATURES.map(({ icon: Icon, color, title, text, soon }) => (
          <div key={title} className="flex gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white" style={{ backgroundColor: color }}>
              <Icon size={20} strokeWidth={2.1} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[16px] font-semibold">
                {title}
                {soon && <Pill>em breve</Pill>}
              </div>
              <div className="text-[14px] leading-snug text-label-2">{text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {(
          [
            { id: "yearly", label: "Anual", price: money(PRICES.yearly), sub: `${money(PRICES.yearly / 12)}/mês`, tag: "−50%" },
            { id: "monthly", label: "Mensal", price: money(PRICES.monthly), sub: "por mês" },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "pressable relative rounded-[20px] border-2 bg-card p-4 text-left transition-colors",
              period === p.id ? "border-label" : "border-transparent",
            )}
          >
            {"tag" in p && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-down px-2 py-0.5 text-[11px] font-bold text-white">{p.tag}</span>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">{p.label}</span>
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border-2",
                  period === p.id ? "border-label bg-label text-bg" : "border-label-3",
                )}
              >
                {period === p.id && <Check size={12} strokeWidth={3.5} />}
              </span>
            </div>
            <div className="mt-2 text-[20px] font-bold tabular tracking-tight">{p.price}</div>
            <div className="text-[13px] text-label-2">{p.sub}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {!pro.trialUsed ? (
          <Button
            onClick={() => {
              startTrial();
              toast(`Pro liberado por ${TRIAL_DAYS} dias`);
              router.back();
            }}
          >
            Testar {TRIAL_DAYS} dias grátis
          </Button>
        ) : (
          <Button disabled>{pro.isPro ? "Você já está no Pro" : "Assinar"}</Button>
        )}
        <p className="px-4 text-center text-[13px] leading-snug text-label-2">
          {pro.trialUsed
            ? "A assinatura paga chega junto com o app nas lojas (App Store e Google Play)."
            : "O teste não pede cartão e não renova sozinho. A assinatura paga chega com o app nas lojas."}
        </p>
      </div>
    </Screen>
  );
}
