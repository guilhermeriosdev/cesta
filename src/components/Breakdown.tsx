"use client";

import { Layers, Minus, Percent, Plus, Tag, type LucideIcon } from "lucide-react";
import { bucketRows, avgPrice, type Breakdown, type Bucket } from "@/lib/analytics";
import { formatQty, money, monthLower, monthShort, percent } from "@/lib/format";
import { ProductRow } from "./ProductRow";
import { Sheet } from "./Sheet";
import { IconTile, List, MoneyChange, Row } from "./ui";

const LINES: Record<Bucket, { icon: LucideIcon; color: string; title: string }> = {
  price: { icon: Tag, color: "#FF9500", title: "Preços" },
  quantity: { icon: Layers, color: "#007AFF", title: "Quantidade" },
  added: { icon: Plus, color: "#34C759", title: "Produtos novos" },
  removed: { icon: Minus, color: "#8E8E93", title: "Deixou de comprar" },
};

function subtitle(b: Breakdown, bucket: Bucket) {
  const count = bucketRows(b, bucket).length;
  const items = `${count} ${count === 1 ? "item" : "itens"}`;
  switch (bucket) {
    case "price":
      return b.priceRatio != null ? `${percent(b.priceRatio)} nos mesmos itens` : "nos mesmos itens";
    case "quantity":
      return b.quantity >= 0 ? "levou mais" : "levou menos";
    case "added":
      return `${items} fora de ${monthShort(b.base)}`;
    case "removed":
      return `${items} só em ${monthShort(b.base)}`;
  }
}

/** As partes da diferença do mês — tocando numa linha, abre os produtos que causaram aquilo. */
export function ChangeList({ breakdown: b, onOpen }: { breakdown: Breakdown; onOpen: (bucket: Bucket) => void }) {
  const buckets = (["price", "quantity", "added", "removed"] as Bucket[]).filter((k) => Math.abs(b[k]) >= 0.01);
  return (
    <List>
      {buckets.map((k) => (
        <Row
          key={k}
          icon={<IconTile icon={LINES[k].icon} color={LINES[k].color} />}
          title={LINES[k].title}
          subtitle={subtitle(b, k)}
          value={<MoneyChange value={b[k]} />}
          onClick={() => onOpen(k)}
          chevron
        />
      ))}
      {Math.abs(b.other) >= 0.5 && (
        <Row
          icon={<IconTile icon={Percent} color="#00C7BE" />}
          title="Descontos e ajustes"
          subtitle="descontos na nota"
          value={<MoneyChange value={b.other} />}
        />
      )}
    </List>
  );
}

export function BucketSheet({ breakdown: b, bucket, onClose }: { breakdown: Breakdown; bucket: Bucket | null; onClose: () => void }) {
  const rows = bucket ? bucketRows(b, bucket) : [];
  const explain: Record<Bucket, string> = {
    price: `Quanto você pagou a mais (ou a menos) só por causa do preço, na quantidade que levou em ${monthLower(b.target)}.`,
    quantity: `Quanto mudou por levar mais ou menos unidades, com o preço de ${monthLower(b.base)}.`,
    added: `Produtos que entraram em ${monthLower(b.target)} e não estavam em ${monthLower(b.base)}.`,
    removed: `Produtos de ${monthLower(b.base)} que você não comprou em ${monthLower(b.target)}.`,
  };

  return (
    <Sheet open={bucket !== null} onClose={onClose} title={bucket ? LINES[bucket].title : undefined}>
      {bucket && (
        <>
          <p className="mb-3 px-1 text-[14px] leading-snug text-label-2">{explain[bucket]}</p>
          <List>
            {rows.map(({ row: r, value }) => {
              const unit = r.product.unit;
              let sub = "";
              if (bucket === "price" && r.base && r.target) {
                sub = `${money(avgPrice(r.base))} → ${money(avgPrice(r.target))} · ${formatQty(r.target.qty, unit)}`;
              } else if (bucket === "quantity" && r.base && r.target) {
                sub = `${formatQty(r.base.qty, unit)} → ${formatQty(r.target.qty, unit)} · ${money(avgPrice(r.base))}`;
              } else if (r.target) {
                sub = `${formatQty(r.target.qty, unit)} × ${money(avgPrice(r.target))}`;
              } else if (r.base) {
                sub = `${formatQty(r.base.qty, unit)} × ${money(avgPrice(r.base))}`;
              }
              return <ProductRow key={r.product.key} product={r.product} subtitle={sub} value={<MoneyChange value={value} />} />;
            })}
          </List>
        </>
      )}
    </Sheet>
  );
}
