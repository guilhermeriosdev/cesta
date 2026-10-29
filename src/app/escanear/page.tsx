"use client";

import { Check, ClipboardPaste, Image as ImageIcon, Link2, LoaderCircle, Receipt, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Scanner } from "@/components/Scanner";
import { Sheet } from "@/components/Sheet";
import { BigMoney, Button, CategoryIcon, List, Row } from "@/components/ui";
import { categorize } from "@/lib/categories";
import { dateTime, formatQty, money } from "@/lib/format";
import { looksLikeNfce } from "@/lib/nfce/url";
import { prettyName, prettyStore } from "@/lib/normalize";
import { decodeImageFile } from "@/lib/qr";
import { toast, useStore } from "@/lib/store";
import type { ParsedReceipt } from "@/lib/types";

type Phase =
  | { kind: "scan" }
  | { kind: "loading" }
  | { kind: "preview"; receipt: ParsedReceipt }
  | { kind: "saved"; id: string; receipt: ParsedReceipt }
  | { kind: "duplicate"; id: string }
  | { kind: "error"; message: string; url: string };

export default function ScanPage() {
  const router = useRouter();
  const addReceipt = useStore((s) => s.addReceipt);
  const [phase, setPhase] = useState<Phase>({ kind: "scan" });
  const [pasting, setPasting] = useState(false);
  const busy = useRef(false);
  const lastInvalid = useRef("");

  const lookup = useCallback(async (text: string) => {
    if (busy.current) return;
    if (!looksLikeNfce(text)) {
      if (lastInvalid.current !== text) {
        lastInvalid.current = text;
        toast("Esse QR Code não é de uma nota fiscal", "error");
      }
      return;
    }
    busy.current = true;
    navigator.vibrate?.(12);
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/nfce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: text.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; receipt: ParsedReceipt }
        | { ok: false; message: string }
        | null;
      if (!data?.ok) throw new Error(data?.message ?? "Não consegui ler essa nota agora.");
      const existing = data.receipt.accessKey
        ? useStore.getState().receipts.find((r) => r.accessKey === data.receipt.accessKey)
        : undefined;
      setPhase(existing ? { kind: "duplicate", id: existing.id } : { kind: "preview", receipt: data.receipt });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Sem conexão. Verifique a internet e tente de novo.",
        url: text,
      });
    } finally {
      busy.current = false;
    }
  }, []);

  const onPhoto = async (file: File) => {
    const text = await decodeImageFile(file).catch(() => null);
    if (text) lookup(text);
    else toast("Não achei um QR Code nessa foto", "error");
  };

  const reset = () => {
    lastInvalid.current = "";
    setPhase({ kind: "scan" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <Scanner active={phase.kind === "scan" && !pasting} onResult={lookup} />

      <div
        className="absolute inset-x-0 top-0 mx-auto flex max-w-md items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        <Link
          href="/"
          aria-label="Fechar"
          className="pressable grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur-xl"
        >
          <X size={20} strokeWidth={2.4} />
        </Link>
        <span className="text-[17px] font-semibold">Escanear nota</span>
        <div className="size-10" />
      </div>

      {phase.kind === "scan" && (
        <div
          className="absolute inset-x-0 bottom-0 mx-auto max-w-md px-5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)" }}
        >
          <p className="mb-5 text-center text-[15px] leading-snug text-white/75">
            Aponte para o QR Code no rodapé
            <br />
            da nota fiscal do mercado
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="pressable flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[18px] bg-white/15 text-[16px] font-semibold backdrop-blur-xl">
              <ImageIcon size={19} strokeWidth={2.2} /> Foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setPasting(true)}
              className="pressable flex h-14 items-center justify-center gap-2 rounded-[18px] bg-white/15 text-[16px] font-semibold backdrop-blur-xl"
            >
              <Link2 size={19} strokeWidth={2.2} /> Colar link
            </button>
          </div>
        </div>
      )}

      {phase.kind === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-md">
          <div className="pop flex flex-col items-center gap-3 rounded-[28px] bg-white/10 px-8 py-7 backdrop-blur-2xl">
            <LoaderCircle size={34} className="animate-spin" strokeWidth={2.2} />
            <span className="text-[16px] font-semibold">Buscando nota na SEFAZ…</span>
          </div>
        </div>
      )}

      {phase.kind === "preview" && (
        <Panel>
          <Preview
            receipt={phase.receipt}
            onDiscard={reset}
            onSave={() => {
              const { id } = addReceipt(phase.receipt);
              navigator.vibrate?.([10, 40, 10]);
              setPhase({ kind: "saved", id, receipt: phase.receipt });
            }}
          />
        </Panel>
      )}

      {phase.kind === "saved" && (
        <Panel>
          <div className="flex flex-col items-center px-4 pt-8 pb-2 text-center">
            <div className="pop grid size-20 place-items-center rounded-full bg-down text-white">
              <Check size={42} strokeWidth={3} />
            </div>
            <h2 className="mt-5 text-[24px] font-bold tracking-tight">Nota salva</h2>
            <p className="mt-1 text-[15px] text-label-2">
              {money(phase.receipt.total)} · {phase.receipt.items.length} itens · {prettyStore(phase.receipt.store.name)}
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <Button onClick={() => router.push("/")}>Ver resumo</Button>
            <Button variant="secondary" onClick={() => router.push(`/notas/${encodeURIComponent(phase.id)}`)}>
              Ver nota
            </Button>
            <Button variant="ghost" onClick={reset}>
              Escanear outra
            </Button>
          </div>
        </Panel>
      )}

      {phase.kind === "duplicate" && (
        <Panel>
          <Message icon={<Receipt size={30} />} title="Essa nota já está salva" text="Cada nota entra só uma vez para não duplicar seus gastos." />
          <div className="mt-6 space-y-2">
            <Button onClick={() => router.push(`/notas/${encodeURIComponent(phase.id)}`)}>Ver nota</Button>
            <Button variant="secondary" onClick={reset}>
              Escanear outra
            </Button>
          </div>
        </Panel>
      )}

      {phase.kind === "error" && (
        <Panel>
          <Message icon={<TriangleAlert size={30} />} title="Não deu para ler a nota" text={phase.message} tone="error" />
          <p className="mt-3 truncate px-4 text-center text-[12px] text-label-3">QR lido: {hostOf(phase.url)}</p>
          <div className="mt-5 space-y-2">
            <Button onClick={() => lookup(phase.url)}>Tentar de novo</Button>
            <Button variant="secondary" onClick={reset}>
              Escanear outra
            </Button>
          </div>
        </Panel>
      )}

      <PasteSheet
        open={pasting}
        onClose={() => setPasting(false)}
        onSubmit={(text) => {
          setPasting(false);
          lookup(text);
        }}
      />
    </div>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return url.slice(0, 60);
  }
};

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-end bg-black/40">
      <div
        className="sheet slide-up mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[30px] px-4 pt-2 text-label"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="mx-auto mb-1 h-[5px] w-9 shrink-0 rounded-full bg-label-3" />
        {children}
      </div>
    </div>
  );
}

function Message({ icon, title, text, tone }: { icon: ReactNode; title: string; text: string; tone?: "error" }) {
  return (
    <div className="flex flex-col items-center px-4 pt-7 text-center">
      <div className={`pop grid size-16 place-items-center rounded-[20px] ${tone === "error" ? "bg-up/12 text-up" : "bg-fill text-label"}`}>
        {icon}
      </div>
      <h2 className="mt-4 text-[21px] font-bold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-[15px] leading-snug text-label-2">{text}</p>
    </div>
  );
}

function Preview({ receipt, onSave, onDiscard }: { receipt: ParsedReceipt; onSave: () => void; onDiscard: () => void }) {
  return (
    <>
      <div className="shrink-0 px-1 pt-3">
        <div className="text-[13px] font-semibold text-label-2">{dateTime(receipt.issuedAt)}</div>
        <h2 className="mt-0.5 truncate text-[22px] font-bold tracking-tight">{prettyStore(receipt.store.name)}</h2>
        <div className="mt-2 flex items-end justify-between">
          <BigMoney value={receipt.total} size={34} />
          <span className="pb-1 text-[14px] font-medium text-label-2">{receipt.items.length} itens</span>
        </div>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <List>
          {receipt.items.map((it, i) => (
            <Row
              key={`${it.name}-${i}`}
              icon={<CategoryIcon category={categorize(it.name)} size={30} />}
              title={<span className="text-[15px]">{prettyName(it.name)}</span>}
              subtitle={`${formatQty(it.qty, it.unit)} × ${money(it.unitPrice)}`}
              value={<span className="text-[15px]">{money(it.total)}</span>}
            />
          ))}
        </List>
        {receipt.discount > 0 && (
          <p className="mt-2 px-2 text-right text-[14px] font-medium text-down">Descontos: −{money(receipt.discount)}</p>
        )}
      </div>
      <div className="mt-4 shrink-0 space-y-2">
        <Button onClick={onSave}>Salvar nota</Button>
        <Button variant="ghost" onClick={onDiscard}>
          Descartar
        </Button>
      </div>
    </>
  );
}

function PasteSheet({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");
  const canPaste = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;

  return (
    <Sheet open={open} onClose={onClose} title="Colar link da nota">
      <div className="text-label">
        <p className="mb-3 px-1 text-[14px] leading-snug text-label-2">
          Leu o QR Code com a câmera do celular? Copie o link que abriu e cole aqui.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="https://www.nfce.fazenda.sp.gov.br/…?p=…"
          className="w-full resize-none rounded-[14px] bg-card px-4 py-3 text-[15px] outline-none"
        />
        <div className="mt-3 space-y-2">
          {canPaste && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setValue(await navigator.clipboard.readText());
                } catch {
                  toast("Não consegui acessar a área de transferência", "error");
                }
              }}
            >
              <ClipboardPaste size={18} /> Colar da área de transferência
            </Button>
          )}
          <Button disabled={!value.trim()} onClick={() => onSubmit(value)}>
            Buscar nota
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
