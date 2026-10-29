"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./ui";

/** Selo "PRO" pequeno, para títulos e linhas. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[linear-gradient(135deg,#FF9500,#FF2D55)] px-1.5 py-px text-[10px] font-bold tracking-wide text-white",
        className,
      )}
    >
      PRO
    </span>
  );
}

/** Cartão que aparece no lugar de um recurso do Pro. Leva para a tela do Pro. */
export function LockedCard({ title, text, className }: { title: string; text?: ReactNode; className?: string }) {
  return (
    <Link
      href="/pro"
      className={cn("pressable flex items-center gap-3.5 rounded-[24px] bg-card p-4 shadow-[var(--shadow)]", className)}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#FF9500,#FF2D55)] text-white">
        <Lock size={20} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[16px] font-semibold">
          {title} <ProBadge />
        </div>
        {text && <div className="mt-0.5 text-[14px] leading-snug text-label-2">{text}</div>}
      </div>
    </Link>
  );
}

/** Ícone de destaque do Pro (tela do Pro e relatório). */
export function ProIcon({ size = 72 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[22px] bg-[linear-gradient(135deg,#FF9500,#FF2D55)] text-white shadow-[0_14px_40px_rgba(255,45,85,0.35)]"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size * 0.48} strokeWidth={1.9} />
    </div>
  );
}
