"use client";

import { Copy, ExternalLink, MapPin, Receipt, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { productHref } from "@/components/ProductRow";
import { Screen } from "@/components/Screen";
import { ConfirmSheet } from "@/components/Sheet";
import { BigMoney, Button, Card, CategoryIcon, Empty, List, Row, Section } from "@/components/ui";
import { categorize } from "@/lib/categories";
import { dateTime, formatQty, money } from "@/lib/format";
import { itemKey, prettyName, prettyStore } from "@/lib/normalize";
import { formatAccessKey } from "@/lib/nfce/url";
import { resolveKey } from "@/lib/analytics";
import { toast, useStore } from "@/lib/store";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const receipt = useStore((s) => s.receipts.find((r) => r.id === id));
  const aliases = useStore((s) => s.aliases);
  const names = useStore((s) => s.names);
  const categories = useStore((s) => s.categories);
  const removeReceipt = useStore((s) => s.removeReceipt);
  const [confirm, setConfirm] = useState(false);

  if (!receipt) {
    return (
      <Screen title="Nota" back={{ href: "/notas", label: "Notas" }} large={false}>
        <Empty icon={Receipt} title="Nota não encontrada" />
      </Screen>
    );
  }

  const store = prettyStore(receipt.store.name);

  return (
    <Screen title={store} back={{ href: "/notas", label: "Notas" }}>
      <Card>
        <div className="text-[13px] font-semibold text-label-2">{dateTime(receipt.issuedAt)}</div>
        <div className="mt-1">
          <BigMoney value={receipt.total} size={38} />
        </div>
        <div className="mt-1 text-[14px] text-label-2">
          {receipt.items.length} itens{receipt.payment ? ` · ${receipt.payment}` : ""}
        </div>
        {receipt.store.address && (
          <div className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-label-2">
            <MapPin size={15} className="mt-px shrink-0" />
            <span>{receipt.store.address}</span>
          </div>
        )}
      </Card>

      <Section title="Itens">
        <List>
          {receipt.items.map((it, i) => {
            const key = resolveKey(itemKey(it), aliases);
            const category = categories[key] ?? categorize(it.name);
            return (
              <Row
                key={`${it.name}-${i}`}
                href={productHref(key)}
                icon={<CategoryIcon category={category} size={30} />}
                title={<span className="text-[15px]">{names[key] ?? prettyName(it.name)}</span>}
                subtitle={`${formatQty(it.qty, it.unit)} × ${money(it.unitPrice)}`}
                value={<span className="text-[15px]">{money(it.total)}</span>}
              />
            );
          })}
        </List>
        <Card className="mt-3 space-y-2 text-[15px]">
          <div className="flex justify-between text-label-2">
            <span>Subtotal</span>
            <span className="tabular">{money(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-down">
              <span>Descontos</span>
              <span className="tabular">−{money(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 text-[17px] font-bold">
            <span>Total</span>
            <span className="tabular">{money(receipt.total)}</span>
          </div>
        </Card>
      </Section>

      <Section title="Detalhes">
        <List>
          <Row title="Mercado" subtitle={receipt.store.name} />
          {receipt.store.cnpj && <Row title="CNPJ" value={<span className="text-[15px] font-normal text-label-2">{receipt.store.cnpj}</span>} />}
          {receipt.accessKey && (
            <Row
              title="Chave de acesso"
              subtitle={<span className="whitespace-normal font-mono text-[12px] tracking-tight">{formatAccessKey(receipt.accessKey)}</span>}
              trailing={<Copy size={16} className="shrink-0 text-label-3" />}
              onClick={() => {
                navigator.clipboard?.writeText(receipt.accessKey!).then(() => toast("Chave copiada"));
              }}
            />
          )}
          {receipt.url && (
            <Row
              title="Ver na SEFAZ"
              onClick={() => window.open(receipt.url, "_blank", "noopener")}
              trailing={<ExternalLink size={16} className="shrink-0 text-label-3" />}
            />
          )}
        </List>
      </Section>

      <div className="mt-8">
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          <Trash size={18} /> Apagar nota
        </Button>
      </div>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Apagar esta nota?"
        message="Os itens dela saem das comparações e do histórico de preços."
        confirmLabel="Apagar nota"
        onConfirm={() => {
          removeReceipt(receipt.id);
          toast("Nota apagada");
          router.replace("/notas");
        }}
      />
    </Screen>
  );
}
