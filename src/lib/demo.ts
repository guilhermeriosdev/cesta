import { currentMonth, shiftMonth } from "./format";
import type { Receipt, ReceiptItem } from "./types";

/** Gerador determinístico (mesma semente = mesmos dados de exemplo) */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ean13(base12: string) {
  const sum = base12
    .split("")
    .map(Number)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

type DemoProduct = {
  name: string;
  /** 9 dígitos que viram um EAN-13 "789…" válido; sem isso é item de balança/código interno */
  ean?: string;
  unit: "UN" | "KG";
  price: number;
  qty: [number, number];
  /** chance de entrar numa compra */
  p: number;
  fresh?: boolean;
  /** meses relativos ao atual em que pode aparecer (0 = mês atual, -5 = cinco meses atrás) */
  from?: number;
  until?: number;
  /** variação de preço extra por mês (inflação do item) */
  drift?: number;
};

const CATALOG: DemoProduct[] = [
  { name: "LEITE UHT ITALAC INTEGRAL 1L", ean: "808064001", unit: "UN", price: 4.79, qty: [6, 12], p: 0.9, drift: 0.015 },
  { name: "ARROZ TIO JOAO T1 5KG", ean: "500020110", unit: "UN", price: 27.9, qty: [1, 1], p: 0.55 },
  { name: "FEIJAO CARIOCA CAMIL 1KG", ean: "102030001", unit: "UN", price: 8.49, qty: [1, 2], p: 0.6, drift: 0.02 },
  { name: "CAFE PILAO TRADICIONAL 500G", ean: "102030002", unit: "UN", price: 18.9, qty: [1, 2], p: 0.7, drift: 0.035 },
  { name: "ACUCAR UNIAO REFINADO 1KG", ean: "102030003", unit: "UN", price: 4.99, qty: [1, 2], p: 0.45 },
  { name: "OLEO SOJA LIZA 900ML", ean: "102030004", unit: "UN", price: 7.29, qty: [1, 2], p: 0.45, drift: -0.01 },
  { name: "MACARRAO ESPAGUETE RENATA 500G", ean: "102030005", unit: "UN", price: 4.59, qty: [1, 3], p: 0.55 },
  { name: "MOLHO TOMATE POMAROLA 340G", ean: "102030006", unit: "UN", price: 3.49, qty: [1, 3], p: 0.5 },
  { name: "AZEITE GALLO EXTRA VIRGEM 500ML", ean: "102030007", unit: "UN", price: 39.9, qty: [1, 1], p: 0.25, drift: -0.02 },
  { name: "OVOS BRANCOS GRANDES C/12", ean: "102030008", unit: "UN", price: 11.9, qty: [1, 2], p: 0.75, drift: 0.02 },
  { name: "QJO MUSSARELA FATIADO", unit: "KG", price: 49.9, qty: [0.2, 0.5], p: 0.6, drift: 0.01 },
  { name: "PRESUNTO COZIDO SADIA", unit: "KG", price: 39.9, qty: [0.2, 0.4], p: 0.5 },
  { name: "IOG NATURAL NESTLE 170G", ean: "102030009", unit: "UN", price: 3.29, qty: [2, 6], p: 0.55 },
  { name: "MANTEIGA AVIACAO C/SAL 200G", ean: "102030010", unit: "UN", price: 15.9, qty: [1, 1], p: 0.35, drift: 0.02 },
  { name: "REQUEIJAO VIGOR CREMOSO 200G", ean: "102030011", unit: "UN", price: 8.99, qty: [1, 2], p: 0.4 },
  { name: "PAO FRANCES", unit: "KG", price: 16.9, qty: [0.4, 1.0], p: 0.7, fresh: true },
  { name: "PAO DE FORMA PULLMAN 480G", ean: "102030012", unit: "UN", price: 9.49, qty: [1, 1], p: 0.35 },
  { name: "PEITO FRANGO S/OSSO CONG", unit: "KG", price: 21.9, qty: [0.8, 1.6], p: 0.6, drift: 0.005 },
  { name: "CARNE MOIDA PATINHO", unit: "KG", price: 44.9, qty: [0.5, 1.0], p: 0.5, drift: 0.025 },
  { name: "REFRIG COCA COLA 2L", ean: "102030013", unit: "UN", price: 11.49, qty: [1, 3], p: 0.55 },
  { name: "CERV HEINEKEN LT 350ML", ean: "102030014", unit: "UN", price: 5.49, qty: [6, 12], p: 0.3 },
  { name: "AGUA MIN CRYSTAL S/GAS 1,5L", ean: "102030015", unit: "UN", price: 2.99, qty: [2, 6], p: 0.45 },
  { name: "SUCO DEL VALLE UVA 1L", ean: "102030016", unit: "UN", price: 8.99, qty: [1, 2], p: 0.3 },
  { name: "DETERG YPE NEUTRO 500ML", ean: "102030017", unit: "UN", price: 2.49, qty: [2, 4], p: 0.45 },
  { name: "SABAO PO OMO LAVAGEM PERFEITA 1,6KG", ean: "102030018", unit: "UN", price: 24.9, qty: [1, 1], p: 0.3 },
  { name: "AMAC COMFORT CONCENTRADO 1L", ean: "102030019", unit: "UN", price: 19.9, qty: [1, 1], p: 0.3 },
  { name: "PAPEL HIG NEVE FOLHA DUPLA 12UN", ean: "102030020", unit: "UN", price: 23.9, qty: [1, 1], p: 0.4 },
  { name: "PAPEL TOALHA SNOB 2UN", ean: "102030021", unit: "UN", price: 6.99, qty: [1, 1], p: 0.3 },
  { name: "CREME DENT COLGATE TOTAL 12 90G", ean: "102030022", unit: "UN", price: 8.49, qty: [1, 2], p: 0.3 },
  { name: "SHAMPOO SEDA CERAMIDAS 325ML", ean: "102030023", unit: "UN", price: 14.9, qty: [1, 1], p: 0.2 },
  { name: "SABONETE DOVE ORIGINAL 90G", ean: "102030024", unit: "UN", price: 4.29, qty: [2, 4], p: 0.3 },
  { name: "BISC NEGRESCO 140G", ean: "102030025", unit: "UN", price: 3.99, qty: [1, 3], p: 0.4 },
  { name: "CHOC LACTA AO LEITE 90G", ean: "102030026", unit: "UN", price: 6.49, qty: [1, 2], p: 0.35, drift: 0.03 },
  { name: "RACAO PEDIGREE ADULTO 1KG", ean: "102030027", unit: "UN", price: 22.9, qty: [1, 1], p: 0.35 },
  { name: "ACHOC NESCAU 400G", ean: "102030028", unit: "UN", price: 9.99, qty: [1, 1], p: 0.6, until: -2 },
  { name: "CAFE 3 CORACOES GOURMET 250G", ean: "102030029", unit: "UN", price: 21.9, qty: [1, 1], p: 0.85, from: 0 },
  { name: "PANETONE BAUDUCCO 500G", ean: "102030030", unit: "UN", price: 29.9, qty: [1, 1], p: 0.8, from: 0 },
  { name: "GRANOLA JASMINE TRADICIONAL 250G", ean: "102030031", unit: "UN", price: 15.9, qty: [1, 1], p: 0.6, from: -1 },
  // Hortifrúti
  { name: "BANANA PRATA", unit: "KG", price: 6.99, qty: [0.8, 1.6], p: 0.85, fresh: true },
  { name: "TOMATE ITALIANO", unit: "KG", price: 8.99, qty: [0.5, 1.2], p: 0.75, fresh: true, drift: 0.03 },
  { name: "CEBOLA NACIONAL", unit: "KG", price: 5.49, qty: [0.5, 1.0], p: 0.65, fresh: true, drift: -0.03 },
  { name: "BATATA INGLESA", unit: "KG", price: 6.49, qty: [0.8, 1.5], p: 0.6, fresh: true },
  { name: "ALFACE CRESPA HIDROPONICA", unit: "UN", price: 3.99, qty: [1, 2], p: 0.55, fresh: true },
  { name: "LIMAO TAHITI", unit: "KG", price: 5.99, qty: [0.3, 0.8], p: 0.5, fresh: true, drift: 0.04 },
  { name: "MACA GALA", unit: "KG", price: 11.9, qty: [0.6, 1.2], p: 0.5, fresh: true },
  { name: "MAMAO PAPAYA", unit: "UN", price: 6.49, qty: [1, 2], p: 0.4, fresh: true },
  { name: "CENOURA", unit: "KG", price: 4.99, qty: [0.4, 0.8], p: 0.45, fresh: true },
  { name: "ABACATE", unit: "KG", price: 9.99, qty: [0.6, 1.2], p: 0.3, fresh: true, from: -1 },
];

const STORES = [
  {
    name: "SUPERMERCADO BOA ESCOLHA LTDA",
    cnpj: "12.345.678/0001-90",
    address: "R. Augusta, 1200, Consolação, São Paulo, SP",
    factor: 1,
  },
  {
    name: "ATACADAO ALVORADA S.A.",
    cnpj: "23.456.789/0001-01",
    address: "Av. Gastão Vidigal, 500, Vila Leopoldina, São Paulo, SP",
    factor: 0.93,
  },
  {
    name: "HORTIFRUTI QUINTAL VERDE LTDA",
    cnpj: "34.567.890/0001-12",
    address: "R. Harmonia, 88, Vila Madalena, São Paulo, SP",
    factor: 0.96,
  },
];

const pad = (n: number, size = 2) => String(n).padStart(size, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;
/** preços de mercado terminam em ,x9 */
const marketPrice = (n: number) => Math.max(0.49, Math.floor(n * 10) / 10 + 0.09);

export function generateDemoReceipts(monthsBack = 6, seed = 42): Receipt[] {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const now = new Date();
  const thisMonth = currentMonth();
  const receipts: Receipt[] = [];
  let seq = 1000;

  for (let offset = -(monthsBack - 1); offset <= 0; offset++) {
    const month = shiftMonth(thisMonth, offset);
    const [year, m] = month.split("-").map(Number);
    const daysInMonth = new Date(year, m, 0).getDate();
    const lastDay = offset === 0 ? Math.max(1, now.getDate() - 1) : daysInMonth;
    const monthIndex = offset + monthsBack;

    // 2 compras grandes (mercado/atacado) + 1 ou 2 idas ao hortifrúti
    const trips: { store: (typeof STORES)[number]; fresh: boolean }[] = [
      { store: STORES[0], fresh: false },
      { store: pick([STORES[0], STORES[1]]), fresh: false },
      { store: STORES[2], fresh: true },
    ];
    if (rand() > 0.4) trips.push({ store: STORES[2], fresh: true });

    const days = trips.map(() => 1 + Math.floor(rand() * lastDay)).sort((a, b) => a - b);

    trips.forEach((trip, t) => {
      const items: ReceiptItem[] = [];
      for (const prod of CATALOG) {
        if (prod.from !== undefined && offset < prod.from) continue;
        if (prod.until !== undefined && offset > prod.until) continue;
        if (trip.fresh !== !!prod.fresh) continue;
        if (rand() > prod.p * (trip.fresh ? 1 : 0.75)) continue;

        const inflation = 1 + (0.006 + (prod.drift ?? 0)) * monthIndex;
        const noise = 1 + (rand() - 0.5) * 0.08;
        const promo = rand() < 0.08 ? 0.85 : 1;
        const unitPrice = marketPrice(prod.price * inflation * noise * promo * trip.store.factor);
        const [lo, hi] = prod.qty;
        const qty =
          prod.unit === "KG" ? Math.round((lo + rand() * (hi - lo)) * 1000) / 1000 : Math.round(lo + rand() * (hi - lo));
        items.push({
          code: prod.ean ? ean13(`789${prod.ean}`) : String(2000 + CATALOG.indexOf(prod)),
          name: prod.name,
          qty,
          unit: prod.unit,
          unitPrice,
          total: round2(unitPrice * qty),
        });
      }
      if (!items.length) return;

      const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
      const discount = rand() < 0.25 ? round2(subtotal * 0.02) : 0;
      const day = days[t];
      const hour = 8 + Math.floor(rand() * 13);
      const minute = Math.floor(rand() * 60);
      seq += 1;
      const cnpjDigits = trip.store.cnpj.replace(/\D/g, "");
      const accessKey = `35${String(year).slice(2)}${pad(m)}${cnpjDigits}65001${pad(seq, 9)}1${pad(seq * 7, 8)}0`;

      receipts.push({
        id: accessKey,
        accessKey,
        uf: "SP",
        store: { name: trip.store.name, cnpj: trip.store.cnpj, address: trip.store.address },
        issuedAt: `${year}-${pad(m)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`,
        items,
        subtotal,
        discount,
        total: round2(subtotal - discount),
        payment: pick(["Cartão de Crédito", "Cartão de Débito", "PIX"]),
        source: "demo",
        createdAt: new Date().toISOString(),
      });
    });
  }
  return receipts;
}
