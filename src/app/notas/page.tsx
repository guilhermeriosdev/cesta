"use client";

import { Receipt, Store } from "lucide-react";
import { useMemo } from "react";
import { LockedCard } from "@/components/Pro";
import { Screen } from "@/components/Screen";
import { Empty, List, Row, Section } from "@/components/ui";
import { money, monthName, monthOf, relativeDay } from "@/lib/format";
import { prettyStore } from "@/lib/normalize";
import { usePro } from "@/lib/pro";
import { useStore } from "@/lib/store";

export default function ReceiptsPage() {
  const receipts = useStore((s) => s.receipts);

  const groups = useMemo(() => {
    const sorted = [...receipts].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    const map = new Map<string, typeof sorted>();
    for (const r of sorted) {
      const m = monthOf(r.issuedAt);
      map.set(m, [...(map.get(m) ?? []), r]);
    }
    return [...map];
  }, [receipts]);
  const pro = usePro();
  const visible = groups.filter(([m]) => !pro.isLocked(m));
  const lockedCount = groups.filter(([m]) => pro.isLocked(m)).reduce((n, [, list]) => n + list.length, 0);

  return (
    <Screen title="Notas" back={{ href: "/", label: "Resumo" }}>
      {groups.length === 0 && <Empty icon={Receipt} title="Nenhuma nota" text="Toque no botão de escanear para adicionar a primeira." />}
      {visible.map(([month, list], i) => (
        <Section
          key={month}
          className={i === 0 ? "mt-2" : undefined}
          title={<span className="text-[17px]">{monthName(month)}</span>}
          action={<span className="text-[15px] font-semibold text-label-2 tabular">{money(list.reduce((s, r) => s + r.total, 0))}</span>}
        >
          <List>
            {list.map((r) => (
              <Row
                key={r.id}
                href={`/notas/${encodeURIComponent(r.id)}`}
                icon={
                  <div className="grid size-[34px] place-items-center rounded-[10px] bg-fill text-label-2">
                    <Store size={17} strokeWidth={2.1} />
                  </div>
                }
                title={prettyStore(r.store.name)}
                subtitle={`${relativeDay(r.issuedAt)} · ${r.items.length} itens${r.source === "demo" ? " · exemplo" : ""}`}
                value={money(r.total)}
                chevron
              />
            ))}
          </List>
        </Section>
      ))}
      {lockedCount > 0 && (
        <LockedCard
          className="mt-8"
          title="Notas mais antigas"
          text={`${lockedCount} ${lockedCount === 1 ? "nota" : "notas"} de meses anteriores ficam no Pro.`}
        />
      )}
    </Screen>
  );
}
