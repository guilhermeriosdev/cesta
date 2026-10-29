"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, cn } from "./ui";

/** Folha que sobe de baixo, como as do iOS. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn("absolute inset-0 bg-black/35 transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-[380ms] ease-[cubic-bezier(.32,.72,0,1)]",
          visible ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-label-3" />
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-3">
            <h3 className="text-[19px] font-bold tracking-tight">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="pressable grid size-[30px] place-items-center rounded-full bg-fill text-label-2"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
        )}
        <div className="min-h-0 overflow-y-auto px-4 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-2 pt-5 pb-2 text-center">
        <h3 className="text-[19px] font-bold">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-snug text-label-2">{message}</p>
      </div>
      <div className="mt-4 space-y-2">
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
