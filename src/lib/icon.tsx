/** Cesta minimalista (traço branco) sobre fundo grafite — usado no ícone do app. */
export const BASKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/></svg>`;

export function AppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const glyph = Math.round(size * (maskable ? 0.46 : 0.58));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #2c2c2e 0%, #0a0a0a 100%)",
      }}
    >
      <img
        width={glyph}
        height={glyph}
        alt=""
        src={`data:image/svg+xml;base64,${Buffer.from(BASKET_SVG).toString("base64")}`}
      />
    </div>
  );
}
