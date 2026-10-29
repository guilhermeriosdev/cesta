"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Beef,
  Bath,
  Carrot,
  ChevronRight,
  Croissant,
  CupSoda,
  Milk,
  Minus,
  PawPrint,
  Search,
  ShoppingBag,
  SprayCan,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { moneyParts, percent } from "@/lib/format";

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/* ---------- Superfícies ---------- */

export function Card({
  children,
  className,
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn("block rounded-[24px] bg-card p-4 shadow-[var(--shadow)]", (href || onClick) && "pressable", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "w-full text-left")}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}

export function WidgetLabel({ icon: Icon, children, color }: { icon?: LucideIcon; children: ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-label-2">
      {Icon && <Icon size={14} strokeWidth={2.4} style={color ? { color } : undefined} />}
      <span className="truncate">{children}</span>
    </div>
  );
}

export function Section({
  title,
  action,
  footer,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
          {title && <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
      {footer && <p className="mt-2 px-4 text-[13px] leading-snug text-label-2">{footer}</p>}
    </section>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="pressable text-[15px] font-medium text-label-2">
      {children}
    </Link>
  );
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ios-list overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow)]", className)}>{children}</div>;
}

export function Row({
  icon,
  title,
  subtitle,
  value,
  valueSub,
  chevron,
  href,
  onClick,
  destructive,
  className,
  trailing,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="row-body flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2.5 pr-4">
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[16px] leading-snug", destructive && "text-up")}>{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-[13px] text-label-2">{subtitle}</div>}
        </div>
        {(value !== undefined || valueSub) && (
          <div className="shrink-0 text-right">
            {value !== undefined && <div className="tabular text-[16px] font-medium">{value}</div>}
            {valueSub && <div className="mt-0.5 text-[13px]">{valueSub}</div>}
          </div>
        )}
        {trailing}
        {chevron && <ChevronRight size={18} className="-mr-1 shrink-0 text-label-3" strokeWidth={2.4} />}
      </div>
    </>
  );
  const cls = cn("row flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-fill", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }
  return <div className={cn(cls, "active:bg-transparent")}>{content}</div>;
}

/* ---------- Controles ---------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "lg" | "md" | "sm";
};

export function Button({ variant = "primary", size = "lg", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "pressable inline-flex items-center justify-center gap-2 font-semibold disabled:pointer-events-none disabled:opacity-40",
        size === "lg" && "h-[52px] w-full rounded-[16px] text-[17px]",
        size === "md" && "h-11 rounded-[14px] px-4 text-[16px]",
        size === "sm" && "h-8 rounded-full px-3.5 text-[14px]",
        variant === "primary" && "bg-label text-bg",
        variant === "secondary" && "bg-fill text-label",
        variant === "ghost" && "text-label",
        variant === "destructive" && "bg-up/12 text-up",
        className,
      )}
    />
  );
}

export function IconButton({
  children,
  label,
  onClick,
  href,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = cn("pressable grid size-[34px] place-items-center rounded-full bg-fill text-label", className);
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={cn("relative grid rounded-[10px] bg-fill p-[2px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        className="absolute top-[2px] bottom-[2px] left-[2px] rounded-[8px] bg-card shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(.3,.7,.2,1)] dark:bg-[#636366]"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 h-[30px] truncate px-1.5 text-[13px] transition-colors",
            o.value === value ? "font-semibold text-label" : "font-medium text-label",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "pressable h-[34px] shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors",
              active ? "bg-label text-bg" : "bg-card text-label shadow-[var(--shadow)]",
            )}
          >
            {o.label}
            {o.count != null && <span className={cn("ml-1.5 tabular", active ? "opacity-60" : "text-label-3")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-[12px] bg-fill px-3 text-label-2">
      <Search size={17} strokeWidth={2.3} className="shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-2"
        enterKeyHint="search"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar busca" className="grid size-5 place-items-center rounded-full bg-label-3 text-card">
          <X size={12} strokeWidth={3} />
        </button>
      )}
    </label>
  );
}

/* ---------- Números ---------- */

export function BigMoney({ value, size = 40, className }: { value: number; size?: number; className?: string }) {
  const { int, cents, negative } = moneyParts(value);
  return (
    <span className={cn("tabular font-bold tracking-tight", className)} style={{ fontSize: size, lineHeight: 1.05 }}>
      <span className="mr-1 align-[0.32em] text-[0.48em] font-semibold text-label-2">{negative ? "−R$" : "R$"}</span>
      {int}
      <span className="text-[0.55em] font-semibold text-label-2">{cents}</span>
    </span>
  );
}

/** Variação: subir preço é vermelho, cair é verde. */
export function Delta({
  value,
  pill,
  className,
  digits = 1,
}: {
  value: number | null | undefined;
  pill?: boolean;
  className?: string;
  digits?: number;
}) {
  if (value == null || !Number.isFinite(value)) return <span className={cn("text-label-3", className)}>—</span>;
  const rounded = Number((value * 100).toFixed(digits));
  const up = rounded > 0;
  const down = rounded < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 font-semibold",
        up ? "text-up" : down ? "text-down" : "text-label-2",
        pill && "rounded-full px-2 py-0.5 text-[13px]",
        pill && (up ? "bg-up/12" : down ? "bg-down/14" : "bg-fill"),
        className,
      )}
    >
      <Icon size={pill ? 13 : 15} strokeWidth={2.8} />
      {percent(Math.abs(value), digits).replace(/^[+−]/, "")}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "up" | "down" | "solid" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold",
        tone === "neutral" && "bg-fill text-label-2",
        tone === "up" && "bg-up/12 text-up",
        tone === "down" && "bg-down/14 text-down",
        tone === "solid" && "bg-label text-bg",
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Ícones ---------- */

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  hortifruti: Carrot,
  carnes: Beef,
  laticinios: Milk,
  padaria: Croissant,
  mercearia: Wheat,
  bebidas: CupSoda,
  limpeza: SprayCan,
  higiene: Bath,
  pets: PawPrint,
  outros: ShoppingBag,
};

export function CategoryIcon({ category, size = 34 }: { category: CategoryId; size?: number }) {
  const Icon = CATEGORY_ICONS[category];
  const { color } = CATEGORIES[category];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[10px]"
      style={{ width: size, height: size, color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.1} />
    </div>
  );
}

export function IconTile({ icon: Icon, color = "#8E8E93", size = 30 }: { icon: LucideIcon; color?: string; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-[8px] text-white" style={{ width: size, height: size, backgroundColor: color }}>
      <Icon size={Math.round(size * 0.58)} strokeWidth={2.2} />
    </div>
  );
}

export function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-[20px] bg-fill text-label-2">
        <Icon size={30} strokeWidth={1.8} />
      </div>
      <h3 className="text-[19px] font-semibold">{title}</h3>
      {text && <p className="mt-1.5 text-[15px] leading-snug text-label-2">{text}</p>}
      {action && <div className="mt-5 w-full max-w-[260px]">{action}</div>}
    </div>
  );
}
