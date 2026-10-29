"use client";

import { Check, GitMerge, ListPlus, Package, Pencil, Split, Tag } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PriceLine } from "@/components/charts";
import { Screen } from "@/components/Screen";
import { Sheet } from "@/components/Sheet";
import { BigMoney, Button, Card, CategoryIcon, Delta, Empty, IconTile, List, Row, SearchField, Section } from "@/components/ui";
import { avgPrice, storeStats, type Product } from "@/lib/analytics";
import { CATEGORIES, CATEGORY_ORDER, categorize } from "@/lib/categories";
import { formatQty, money, monthName, relativeDay, unitLabel } from "@/lib/format";
import { normalizeText, prettyName, prettyStore } from "@/lib/normalize";
import { toast, useData, useStore } from "@/lib/store";

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export default function ProductPage() {
  const params = useParams<{ key: string }>();
  const key = decode(params.key);
  const { products } = useData();
  const product = products.find((p) => p.key === key);

  if (!product) {
    return (
      <Screen title="Produto" back={{ href: "/produtos", label: "Produtos" }} large={false}>
        <Empty icon={Package} title="Produto não encontrado" text="Ele pode ter sido juntado com outro produto." />
      </Screen>
    );
  }
  return <ProductDetail product={product} products={products} />;
}

function ProductDetail({ product: p, products }: { product: Product; products: Product[] }) {
  const [sheet, setSheet] = useState<null | "rename" | "category" | "merge">(null);
  const shopping = useStore((s) => s.shopping);
  const addShopping = useStore((s) => s.addShopping);
  const unmerge = useStore((s) => s.unmerge);

  const unit = unitLabel(p.unit);
  const prices = p.purchases.map((x) => x.unitPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const previous = p.purchases.length > 1 ? p.purchases[p.purchases.length - 2].unitPrice : null;
  const stores = useMemo(() => storeStats(p), [p]);
  const monthsDesc = Object.keys(p.months).sort().reverse();
  const inList = shopping.some((i) => !i.checked && i.productKey === p.key);
  const extraSources = p.sources.filter((s) => s.key !== p.key);

  return (
    <Screen title={p.name} back={{ href: "/produtos", label: "Produtos" }}>
      <Card>
        <div className="flex items-start gap-3">
          <CategoryIcon category={p.category} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-label-2">{CATEGORIES[p.category].label}</div>
            <div className="mt-0.5 truncate text-[12px] text-label-3">{p.sources[0]?.name}</div>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[13px] text-label-2">Último preço · {relativeDay(p.lastDate)}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <BigMoney value={p.lastPrice} size={36} />
              <span className="text-[15px] font-semibold text-label-2">/{unit}</span>
            </div>
          </div>
          {previous != null && (
            <div className="pb-1 text-right">
              <Delta value={p.lastPrice / previous - 1} pill />
              <div className="mt-1 text-[12px] text-label-2">vs. compra anterior</div>
            </div>
          )}
        </div>
        {p.purchases.length > 1 && (
          <div className="mt-5">
            <PriceLine points={p.purchases.map((x) => ({ date: x.date, value: x.unitPrice }))} />
          </div>
        )}
        <div className="mt-4 flex justify-between border-t border-sep pt-3 text-[13px] text-label-2">
          <span>
            {p.times}× em {monthsDesc.length} {monthsDesc.length === 1 ? "mês" : "meses"}
          </span>
          {p.purchases.length > 1 && (
            <span className="tabular">
              {money(min)} a {money(max)}
            </span>
          )}
        </div>
      </Card>

      <Section title="Mês a mês">
        <List>
          {monthsDesc.map((m) => {
            const stat = p.months[m];
            return (
              <Row
                key={m}
                title={monthName(m)}
                subtitle={`${formatQty(stat.qty, p.unit)} × ${money(avgPrice(stat))}`}
                value={money(stat.spent)}
              />
            );
          })}
        </List>
      </Section>

      {stores.length > 1 && (
        <Section title="Onde comprou" footer={`Mais barato em média: ${prettyStore(stores[0].store)}.`}>
          <List>
            {stores.map((s, i) => (
              <Row
                key={s.store}
                title={prettyStore(s.store)}
                subtitle={`${s.times}× · última ${relativeDay(s.last)}`}
                value={`${money(s.avg)}/${unit}`}
                valueSub={i === 0 ? <span className="font-semibold text-down">mais barato</span> : undefined}
              />
            ))}
          </List>
        </Section>
      )}

      {extraSources.length > 0 && (
        <Section title="Também inclui" footer="Nomes de outras notas que você juntou com este produto.">
          <List>
            {extraSources.map((s) => (
              <Row
                key={s.key}
                title={<span className="text-[15px]">{prettyName(s.name)}</span>}
                trailing={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      unmerge(s.key);
                      toast("Produto separado");
                    }}
                  >
                    <Split size={14} /> Separar
                  </Button>
                }
              />
            ))}
          </List>
        </Section>
      )}

      <Section>
        <List>
          <Row
            icon={<IconTile icon={ListPlus} color="#34C759" />}
            title={inList ? "Já está na lista" : "Adicionar à lista"}
            onClick={
              inList
                ? undefined
                : () => {
                    addShopping([{ name: p.name, productKey: p.key, unit: p.unit }]);
                    toast("Adicionado à lista");
                  }
            }
            trailing={inList ? <Check size={18} className="text-down" /> : undefined}
          />
          <Row icon={<IconTile icon={Pencil} color="#007AFF" />} title="Renomear" onClick={() => setSheet("rename")} chevron />
          <Row
            icon={<IconTile icon={Tag} color="#FF9500" />}
            title="Categoria"
            value={<span className="text-[15px] font-normal text-label-2">{CATEGORIES[p.category].label}</span>}
            onClick={() => setSheet("category")}
            chevron
          />
          <Row icon={<IconTile icon={GitMerge} color="#5856D6" />} title="Juntar com outro produto" onClick={() => setSheet("merge")} chevron />
        </List>
        <p className="mt-2 px-4 text-[13px] leading-snug text-label-2">
          Mercados diferentes escrevem o mesmo produto de jeitos diferentes. Junte-os para comparar o preço de verdade.
        </p>
      </Section>

      <RenameSheet open={sheet === "rename"} onClose={() => setSheet(null)} product={p} />
      <CategorySheet open={sheet === "category"} onClose={() => setSheet(null)} product={p} />
      <MergeSheet open={sheet === "merge"} onClose={() => setSheet(null)} product={p} products={products} />
    </Screen>
  );
}

function RenameSheet({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product }) {
  const rename = useStore((s) => s.renameProduct);
  const custom = useStore((s) => s.names[product.key]);
  const [value, setValue] = useState(product.name);
  const original = prettyName(product.purchases[product.purchases.length - 1].rawName);

  return (
    <Sheet open={open} onClose={onClose} title="Renomear">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rename(product.key, value);
          toast("Nome atualizado");
          onClose();
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 w-full rounded-[14px] bg-card px-4 outline-none"
          placeholder="Ex.: Leite integral"
        />
        <p className="mt-2 px-1 text-[13px] text-label-2">Na nota: {original}</p>
        <div className="mt-5 space-y-2">
          <Button type="submit" disabled={!value.trim()}>
            Salvar
          </Button>
          {custom && (
            <Button
              variant="secondary"
              onClick={() => {
                rename(product.key, null);
                setValue(original);
                toast("Nome original restaurado");
                onClose();
              }}
            >
              Usar nome da nota
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

function CategorySheet({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product }) {
  const setCategory = useStore((s) => s.setCategory);
  const auto = categorize(product.purchases[product.purchases.length - 1].rawName);
  return (
    <Sheet open={open} onClose={onClose} title="Categoria">
      <List>
        {CATEGORY_ORDER.map((c) => (
          <Row
            key={c}
            icon={<CategoryIcon category={c} size={30} />}
            title={CATEGORIES[c].label}
            subtitle={c === auto ? "sugerida automaticamente" : undefined}
            onClick={() => {
              setCategory(product.key, c === auto ? null : c);
              onClose();
            }}
            trailing={c === product.category ? <Check size={20} strokeWidth={2.6} /> : undefined}
          />
        ))}
      </List>
    </Sheet>
  );
}

function MergeSheet({
  open,
  onClose,
  product,
  products,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  products: Product[];
}) {
  const merge = useStore((s) => s.mergeProducts);
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    const q = normalizeText(query);
    const words = normalizeText(product.name).split(" ").filter((w) => w.length > 2);
    const score = (x: Product) => words.filter((w) => normalizeText(x.name).includes(w)).length;
    return products
      .filter((x) => x.key !== product.key)
      .filter((x) => !q || normalizeText(`${x.name} ${x.sources.map((s) => s.name).join(" ")}`).includes(q))
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [products, product, query]);

  return (
    <Sheet open={open} onClose={onClose} title="Juntar com…">
      <p className="mb-3 px-1 text-[14px] leading-snug text-label-2">
        O histórico do produto escolhido passa a fazer parte de <b className="text-label">{product.name}</b>. Dá para desfazer depois.
      </p>
      <SearchField value={query} onChange={setQuery} placeholder="Buscar produto" />
      <List className="mt-3">
        {candidates.map((x) => (
          <Row
            key={x.key}
            icon={<CategoryIcon category={x.category} size={30} />}
            title={x.name}
            subtitle={`${x.times}× · ${money(x.lastPrice)}/${unitLabel(x.unit)}`}
            onClick={() => {
              merge(x.key, product.key);
              toast("Produtos juntados");
              onClose();
            }}
          />
        ))}
      </List>
    </Sheet>
  );
}
