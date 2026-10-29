"use client";

import { money, monthName, percent } from "./format";
import { prettyStore } from "./normalize";
import type { YearReport } from "./report";

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Imagem 1080×1920 (formato de story) com o resumo do ano. */
export async function renderReportImage(r: YearReport): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, "#2c2c2e");
  bg.addColorStop(1, "#050505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 260, 0, W * 0.85, 260, 700);
  glow.addColorStop(0, "rgba(255,45,85,0.45)");
  glow.addColorStop(1, "rgba(255,45,85,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const X = 96;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 44px ${FONT}`;
  ctx.fillText(`MEU ${r.year} NO MERCADO`, X, 300);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 150px ${FONT}`;
  ctx.fillText(fit(ctx, money(r.total), W - X * 2), X, 470);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 46px ${FONT}`;
  ctx.fillText(`${r.receipts} notas · ${r.storesCount} ${r.storesCount === 1 ? "mercado" : "mercados"}`, X, 550);

  // [rótulo, texto principal (pode ser cortado), final que nunca é cortado]
  const lines: [string, string, string][] = [];
  if (r.topMonth) lines.push(["Mês mais caro", monthName(r.topMonth.month, { year: false }), ` · ${money(r.topMonth.total)}`]);
  if (r.champion) lines.push(["Produto campeão", r.champion.product.name, ` · ${r.champion.times}×`]);
  if (r.categories[0]) lines.push(["Onde foi mais dinheiro", r.categories[0].label, ` · ${Math.round(r.categories[0].share * 100)}%`]);
  if (r.biggestRise) lines.push(["O que mais subiu", r.biggestRise.product.name, ` · ${percent(r.biggestRise.change, 0)}`]);
  if (r.favoriteStore) lines.push(["Mercado favorito", prettyStore(r.favoriteStore.name), ""]);

  let y = 760;
  for (const [label, main, suffix] of lines.slice(0, 5)) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(X - 24, y - 70, W - (X - 24) * 2, 170, 36);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(label, X + 12, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 54px ${FONT}`;
    const room = W - X * 2 - 24 - ctx.measureText(suffix).width;
    ctx.fillText(fit(ctx, main, room) + suffix, X + 12, y + 68);
    y += 205;
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText("Cesta · seu mercado, mês a mês", X, H - 130);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}

/** Compartilha (celular) ou baixa (computador) a imagem do relatório. */
export async function shareReport(r: YearReport) {
  const blob = await renderReportImage(r);
  const file = new File([blob], `meu-${r.year}-no-mercado.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `Meu ${r.year} no mercado` });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
