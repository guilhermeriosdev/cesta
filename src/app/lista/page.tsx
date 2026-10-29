"use client";

import { Check, ListChecks, Plus, Repeat, Share, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { Meter } from "@/components/charts";
import { Screen } from "@/components/Screen";
import { Sheet } from "@/components/Sheet";
import { Button, CategoryIcon, Empty, IconButton, List, Row, Section, Segmented, cn } from "@/components/ui";
import { recurringProducts, type Recurring } from "@/lib/analytics";
import { formatQty, money, unitLabel } from "@/lib/format";
import { normalizeText } from "@/lib/normalize";
import { toast, useData, useStore } from "@/lib/store";
import type { ShoppingItem } from "@/lib/types";

type Tab = "lista" | "sempre";

export default function ShoppingPage() {
  const [tab, setTab] = useState<Tab>("lista");
  const [adding, setAdding] = useState(false);
  const shopping = useStore((s) => s.shopping);
  const addShopping = useStore((s) => s.addShopping);
  const { products, months } = useData();
  const recurring = useMemo(() => recurringProducts(products, months), [products, months]);
  const pending = shopping.filter((i) => !i.checked);
  const done = shopping.filter((i) => i.checked);
  const inList = new Set(pending.map((i) => i.productKey).filter(Boolean));

  const addRecurring = (items: Recurring[]) =>
    addShopping(
      items.map((r) => ({ name: r.product.name, productKey: r.product.key, qty: r.suggestedQty, unit: r.product.unit })),
    );

  const share = async () => {
    const text = ["Lista de compras", "", ...pending.map((i) => `☐ ${i.name}${i.qty ? ` — ${formatQty(i.qty, i.unit ?? "UN")}` : ""}`)].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Lista de compras", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Lista copiada");
      }
    } catch {
      // compartilhamento cancelado
    }
  };

  return (
    <Screen
      title="Lista"
      right={
        <>
          {pending.length > 0 && (
            <IconButton label="Compartilhar lista" onClick={share}>
              <Share size={17} strokeWidth={2.2} />
            </IconButton>
          )}
          <IconButton label="Adicionar item" onClick={() => setAdding(true)}>
            <Plus size={19} strokeWidth={2.4} />
          </IconButton>
        </>
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "lista", label: pending.length ? `Minha lista · ${pending.length}` : "Minha lista" },
          { value: "sempre", label: "Sempre compro" },
        ]}
      />

      {tab === "lista" ? (
        <>
          {shopping.length === 0 ? (
            <Empty
              icon={ListChecks}
              title="Lista vazia"
              text={
                recurring.length
                  ? `Você tem ${recurring.length} produtos que compra quase todo mês. Quer começar por eles?`
                  : "Adicione itens com o + ou escaneie notas para gerar a lista automaticamente."
              }
              action={
                recurring.length > 0 && (
                  <Button
                    onClick={() => {
                      const n = addRecurring(recurring);
                      toast(`${n} itens adicionados`);
                    }}
                  >
                    <Repeat size={18} /> Gerar lista
                  </Button>
                )
              }
            />
          ) : (
            <>
              {pending.length > 0 && (
                <List className="mt-4">
                  {pending.map((i) => (
                    <ShoppingRow key={i.id} item={i} />
                  ))}
                </List>
              )}
              {pending.length === 0 && (
                <p className="py-10 text-center text-[15px] text-label-2">Tudo comprado. 🎉</p>
              )}
              {done.length > 0 && (
                <Section
                  title={<span className="text-[17px]">Concluídos</span>}
                  action={
                    <button
                      type="button"
                      onClick={() => useStore.getState().clearChecked()}
                      className="pressable text-[15px] font-medium text-label-2"
                    >
                      Limpar
                    </button>
                  }
                  className="mt-6"
                >
                  <List>
                    {done.map((i) => (
                      <ShoppingRow key={i.id} item={i} />
                    ))}
                  </List>
                </Section>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {recurring.length === 0 ? (
            <Empty
              icon={Repeat}
              title="Ainda sem padrão"
              text="Quando um produto aparece em pelo menos metade dos meses (e em no mínimo 2), ele entra aqui sozinho."
            />
          ) : (
            <>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const n = addRecurring(recurring.filter((r) => !inList.has(r.product.key)));
                    toast(n ? `${n} itens adicionados à lista` : "Tudo já está na lista");
                  }}
                >
                  <Plus size={18} strokeWidth={2.4} /> Adicionar todos à lista
                </Button>
              </div>
              <List className="mt-3">
                {recurring.map((r) => {
                  const added = inList.has(r.product.key);
                  return (
                    <Row
                      key={r.product.key}
                      icon={<CategoryIcon category={r.product.category} />}
                      title={r.product.name}
                      subtitle={
                        <span className="flex items-center gap-2">
                          <Meter value={r.monthsCount} max={r.span} className="w-12 shrink-0" />
                          <span className="truncate">
                            {r.monthsCount} de {r.span} meses · ~{formatQty(r.suggestedQty, r.product.unit)}/mês
                          </span>
                        </span>
                      }
                      trailing={
                        <button
                          type="button"
                          aria-label={added ? "Já está na lista" : "Adicionar à lista"}
                          disabled={added}
                          onClick={() => {
                            addRecurring([r]);
                            toast("Adicionado à lista");
                          }}
                          className={cn(
                            "pressable grid size-8 shrink-0 place-items-center rounded-full",
                            added ? "bg-down/15 text-down" : "bg-fill text-label",
                          )}
                        >
                          {added ? <Check size={17} strokeWidth={2.8} /> : <Plus size={18} strokeWidth={2.4} />}
                        </button>
                      }
                    />
                  );
                })}
              </List>
              <p className="mt-2 px-4 text-[13px] leading-snug text-label-2">
                Produtos que aparecem em pelo menos metade dos meses com nota. A quantidade sugerida é a sua média por mês.
              </p>
            </>
          )}
        </>
      )}

      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function ShoppingRow({ item }: { item: ShoppingItem }) {
  const toggle = useStore((s) => s.toggleShopping);
  const remove = useStore((s) => s.removeShopping);
  return (
    <div className="row flex items-center gap-3 pl-4">
      <button
        type="button"
        aria-label={item.checked ? "Desmarcar" : "Marcar como comprado"}
        onClick={() => {
          toggle(item.id);
          navigator.vibrate?.(8);
        }}
        className={cn(
          "grid size-[24px] shrink-0 place-items-center rounded-full border-[1.8px] transition-all duration-200",
          item.checked ? "border-label bg-label text-bg" : "border-label-3",
        )}
      >
        {item.checked && <Check size={14} strokeWidth={3.2} />}
      </button>
      <div className="row-body flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2.5 pr-3">
        <button type="button" onClick={() => toggle(item.id)} className="min-w-0 flex-1 text-left">
          <div className={cn("truncate text-[16px] transition-colors", item.checked && "text-label-3 line-through")}>{item.name}</div>
          {item.qty != null && (
            <div className="text-[13px] text-label-2">{formatQty(item.qty, item.unit ?? "UN")}</div>
          )}
        </button>
        <button
          type="button"
          aria-label="Remover"
          onClick={() => remove(item.id)}
          className="pressable grid size-8 shrink-0 place-items-center rounded-full text-label-3"
        >
          <Trash size={16} strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addShopping = useStore((s) => s.addShopping);
  const { products } = useData();
  const [name, setName] = useState("");

  const suggestions = useMemo(() => {
    const q = normalizeText(name);
    if (q.length < 2) return [];
    return products
      .filter((p) => normalizeText(p.name).includes(q))
      .sort((a, b) => b.times - a.times)
      .slice(0, 5);
  }, [name, products]);

  const close = () => {
    setName("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Novo item">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addShopping([{ name: name.trim() }]);
          toast("Adicionado à lista");
          close();
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Pão de forma"
          className="h-12 w-full rounded-[14px] bg-card px-4 outline-none"
        />
        {suggestions.length > 0 && (
          <List className="mt-3">
            {suggestions.map((p) => (
              <Row
                key={p.key}
                icon={<CategoryIcon category={p.category} size={30} />}
                title={p.name}
                subtitle={`último: ${money(p.lastPrice)}/${unitLabel(p.unit)}`}
                onClick={() => {
                  addShopping([{ name: p.name, productKey: p.key, unit: p.unit }]);
                  toast("Adicionado à lista");
                  close();
                }}
              />
            ))}
          </List>
        )}
        <Button type="submit" className="mt-4" disabled={!name.trim()}>
          Adicionar
        </Button>
      </form>
    </Sheet>
  );
}
