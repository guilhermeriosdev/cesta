"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";

type Back = { href?: string; label?: string };

/**
 * Tela com título grande estilo iOS: ao rolar, o título encolhe para a barra
 * de cima, que ganha fundo translúcido.
 */
export function Screen({
  title,
  eyebrow,
  back,
  right,
  large = true,
  children,
}: {
  title: string;
  eyebrow?: ReactNode;
  back?: Back;
  right?: ReactNode;
  large?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(!large);

  useEffect(() => {
    if (!large || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [large]);

  const backContent = (
    <>
      <ChevronLeft size={26} strokeWidth={2.3} className="-ml-1" />
      <span className="max-w-[90px] truncate text-[17px]">{back?.label ?? "Voltar"}</span>
    </>
  );

  return (
    <div className="animate-in">
      <header
        className={cn(
          "sticky top-0 z-30 transition-[background-color,border-color] duration-200",
          compact ? "border-b border-sep bg-bg/80 backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative flex h-[50px] items-center justify-between px-3">
          <div className="z-10 flex min-w-0 items-center">
            {back &&
              (back.href ? (
                <Link href={back.href} className="pressable flex items-center text-label">
                  {backContent}
                </Link>
              ) : (
                <button type="button" onClick={() => router.back()} className="pressable flex items-center text-label">
                  {backContent}
                </button>
              ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-24 truncate text-center text-[17px] font-semibold transition-opacity duration-200",
              compact ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </div>
          <div className="z-10 flex items-center gap-2">{right}</div>
        </div>
      </header>

      {large && (
        <div className="px-5 pb-3">
          {eyebrow && <p className="mb-0.5 text-[13px] font-semibold uppercase tracking-wide text-label-2">{eyebrow}</p>}
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-tight">{title}</h1>
          <div ref={sentinel} />
        </div>
      )}

      <div className="px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}>
        {children}
      </div>
    </div>
  );
}
