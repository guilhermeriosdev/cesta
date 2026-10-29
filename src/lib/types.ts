import type { CategoryId } from "./categories";

export type ReceiptItem = {
  /** Código do produto na nota (muitas vezes é o EAN/GTIN) */
  code?: string;
  /** Descrição como veio na nota */
  name: string;
  qty: number;
  /** UN, KG, L, PCT... */
  unit: string;
  unitPrice: number;
  total: number;
};

export type Store = {
  name: string;
  cnpj?: string;
  address?: string;
};

export type Receipt = {
  id: string;
  /** Chave de acesso de 44 dígitos — usada para evitar notas duplicadas */
  accessKey?: string;
  url?: string;
  uf?: string;
  store: Store;
  /** Data/hora local de emissão, sem fuso: "2026-10-12T18:33:22" */
  issuedAt: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment?: string;
  source: "qrcode" | "demo" | "import";
  createdAt: string;
};

/** O que a API devolve depois de ler a página da SEFAZ */
export type ParsedReceipt = Omit<Receipt, "id" | "source" | "createdAt">;

export type ShoppingItem = {
  id: string;
  name: string;
  productKey?: string;
  qty?: number;
  unit?: string;
  checked: boolean;
  addedAt: string;
};

export type Prefs = {
  /** chave de produto -> chave canônica (produtos juntados) */
  aliases: Record<string, string>;
  /** chave canônica -> nome escolhido pela pessoa */
  names: Record<string, string>;
  /** chave canônica -> categoria escolhida pela pessoa */
  categories: Record<string, CategoryId>;
};
