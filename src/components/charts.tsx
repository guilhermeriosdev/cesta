"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dateTime, money, monthShort } from "@/lib/format";
import { cn } from "./ui";

/** Barras mensais — a do mês selecionado fica em destaque. */
export function MonthBars({
  data,
  selected,
  onSelect,
  height = 92,
}: {
  data: { month: string; value: number }[];
  selected?: string;
  onSelect?: (month: string) => void;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2">
      {data.map((d) => {
        const active = d.month === selected;
        const h = d.value > 0 ? Math.max(6, (d.value / max) * height) : 4;
        return (
          <button
            type="button"
            key={d.month}
            onClick={() => onSelect?.(d.month)}
            disabled={!onSelect || d.value === 0}
            aria-label={`${d.month}: ${money(d.value)}`}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex w-full items-end justify-center" style={{ height }}>
              <div
                className={cn(
                  "w-full max-w-[34px] rounded-[7px] transition-[height,background-color] duration-500 ease-out",
                  active ? "bg-label" : d.value > 0 ? "bg-fill-strong" : "bg-fill",
                )}
                style={{ height: h }}
              />
            </div>
            <span className={cn("text-[11px] font-semibold", active ? "text-label" : "text-label-3")}>{monthShort(d.month)}</span>
          </button>
        );
      })}
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Linha de preço por compra, estilo app Ações. */
export function PriceLine({ points, height = 150 }: { points: { date: string; value: number }[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { top: 16, bottom: 22, left: 4, right: 4 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max * 0.1 || 1;
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${height - pad.bottom} L${x(0).toFixed(1)},${height - pad.bottom} Z`;
  const active = hover ?? points.length - 1;
  const trend = points.length > 1 ? points[points.length - 1].value - points[0].value : 0;
  const color = trend > 0.0001 ? "var(--up)" : trend < -0.0001 ? "var(--down)" : "var(--label)";

  const onMove = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || points.length < 2) return;
    const rel = (clientX - rect.left - pad.left) / innerW;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };

  return (
    <div
      ref={ref}
      className="relative w-full touch-pan-y select-none"
      style={{ height }}
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
    >
      {width > 0 && points.length > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <line x1={pad.left} x2={width - pad.right} y1={y(max)} y2={y(max)} stroke="var(--sep)" strokeDasharray="3 4" />
          <line x1={pad.left} x2={width - pad.right} y1={y(min)} y2={y(min)} stroke="var(--sep)" strokeDasharray="3 4" />
          {points.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
          {points.length > 1 && (
            <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {hover != null && (
            <line x1={x(active)} x2={x(active)} y1={pad.top - 6} y2={height - pad.bottom} stroke="var(--label-3)" />
          )}
          <circle cx={x(active)} cy={y(points[active].value)} r={5.5} fill={color} stroke="var(--card)" strokeWidth={2.5} />
          <text x={pad.left} y={height - 4} fontSize={11} fill="var(--label-3)" fontWeight={600}>
            {dateTime(points[0].date).split(" · ")[0]}
          </text>
          <text x={width - pad.right} y={height - 4} fontSize={11} fill="var(--label-3)" fontWeight={600} textAnchor="end">
            {dateTime(points[points.length - 1].date).split(" · ")[0]}
          </text>
        </svg>
      )}
      {width > 0 && points.length > 0 && (
        <div
          className="pointer-events-none absolute -top-1 rounded-full bg-label px-2 py-0.5 text-[12px] font-semibold text-bg tabular"
          style={{ left: Math.min(Math.max(x(active) - 34, 0), width - 76) }}
        >
          {money(points[active].value)}
        </div>
      )}
    </div>
  );
}

/** Mini barra de progresso (ex.: frequência "5 de 6 meses") */
export function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className={cn("flex gap-[3px]", className)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < value ? "bg-label" : "bg-fill-strong")} />
      ))}
    </div>
  );
}
