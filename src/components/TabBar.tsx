"use client";

import { ChartColumn, House, ListChecks, Package, ScanLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { cn } from "./ui";

const TABS = [
  { href: "/", label: "Início", icon: House, match: ["/", "/notas", "/ajustes"] },
  { href: "/produtos", label: "Produtos", icon: Package, match: ["/produtos"] },
  { href: "/comparar", label: "Comparar", icon: ChartColumn, match: ["/comparar"] },
  { href: "/lista", label: "Lista", icon: ListChecks, match: ["/lista"] },
];

/** Barra flutuante no estilo "vidro" do iOS, com o botão de escanear separado. */
export function TabBar() {
  const pathname = usePathname();
  const empty = useStore((s) => s.receipts.length === 0);
  // Escondida na câmera e na tela de boas-vindas
  if (pathname.startsWith("/escanear") || (empty && pathname === "/")) return null;

  const isActive = (match: string[]) =>
    match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(`${m}/`)));

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-end gap-2.5 px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="pointer-events-auto flex h-[62px] flex-1 items-center justify-around rounded-full border border-glass-border bg-glass px-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-[1.8]">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = isActive(match);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200",
                active ? "bg-fill text-label" : "text-label-2",
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>{label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/escanear"
        aria-label="Escanear nota"
        className="pressable pointer-events-auto grid size-[62px] shrink-0 place-items-center rounded-full bg-label text-bg shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <ScanLine size={24} strokeWidth={2.2} />
      </Link>
    </nav>
  );
}
