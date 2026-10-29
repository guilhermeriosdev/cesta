"use client";

import { del, get, set } from "idb-keyval";
import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { buildProducts, monthsWithData } from "./analytics";
import type { CategoryId } from "./categories";
import { generateDemoReceipts } from "./demo";
import { currentMonth } from "./format";
import type { ParsedReceipt, Prefs, Receipt, ShoppingItem } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** IndexedDB: guarda bem mais que o localStorage e não trava a tela. */
const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

type Data = Prefs & { receipts: Receipt[]; shopping: ShoppingItem[] };

export type Backup = { app: "cesta"; version: 1; exportedAt: string; data: Data };

type NewShoppingItem = { name: string; productKey?: string; qty?: number; unit?: string };

type State = Data & {
  hydrated: boolean;
  addReceipt: (draft: ParsedReceipt, source?: Receipt["source"]) => { id: string; duplicate: boolean };
  removeReceipt: (id: string) => void;
  renameProduct: (key: string, name: string | null) => void;
  setCategory: (key: string, category: CategoryId | null) => void;
  mergeProducts: (from: string, into: string) => void;
  unmerge: (sourceKey: string) => void;
  addShopping: (items: NewShoppingItem[]) => number;
  toggleShopping: (id: string) => void;
  removeShopping: (id: string) => void;
  clearChecked: () => void;
  loadDemo: () => void;
  removeDemo: () => void;
  importBackup: (backup: Backup) => number;
  exportBackup: () => Backup;
  reset: () => void;
};

const empty: Data = { receipts: [], shopping: [], aliases: {}, names: {}, categories: {} };

export const useStore = create<State>()(
  persist(
    (setState, getState) => ({
      ...empty,
      hydrated: false,

      addReceipt: (draft, source = "qrcode") => {
        const existing = draft.accessKey ? getState().receipts.find((r) => r.accessKey === draft.accessKey) : undefined;
        if (existing) return { id: existing.id, duplicate: true };
        const id = draft.accessKey ?? uid();
        const receipt: Receipt = { ...draft, id, source, createdAt: new Date().toISOString() };
        setState((s) => ({ receipts: [...s.receipts, receipt] }));
        return { id, duplicate: false };
      },

      removeReceipt: (id) => setState((s) => ({ receipts: s.receipts.filter((r) => r.id !== id) })),

      renameProduct: (key, name) =>
        setState((s) => {
          const names = { ...s.names };
          if (name?.trim()) names[key] = name.trim();
          else delete names[key];
          return { names };
        }),

      setCategory: (key, category) =>
        setState((s) => {
          const categories = { ...s.categories };
          if (category) categories[key] = category;
          else delete categories[key];
          return { categories };
        }),

      mergeProducts: (from, into) =>
        setState((s) => {
          if (from === into) return {};
          const names = { ...s.names };
          const categories = { ...s.categories };
          delete names[from];
          delete categories[from];
          return {
            aliases: { ...s.aliases, [from]: into },
            names,
            categories,
            shopping: s.shopping.map((i) => (i.productKey === from ? { ...i, productKey: into } : i)),
          };
        }),

      unmerge: (sourceKey) =>
        setState((s) => {
          const aliases = { ...s.aliases };
          delete aliases[sourceKey];
          return { aliases };
        }),

      addShopping: (items) => {
        const current = getState().shopping;
        const fresh = items.filter(
          (n) =>
            !current.some(
              (c) =>
                !c.checked &&
                ((n.productKey && c.productKey === n.productKey) || c.name.toLowerCase() === n.name.toLowerCase()),
            ),
        );
        if (!fresh.length) return 0;
        const now = new Date().toISOString();
        setState((s) => ({
          shopping: [...s.shopping, ...fresh.map((n) => ({ ...n, id: uid(), checked: false, addedAt: now }))],
        }));
        return fresh.length;
      },

      toggleShopping: (id) =>
        setState((s) => ({ shopping: s.shopping.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) })),

      removeShopping: (id) => setState((s) => ({ shopping: s.shopping.filter((i) => i.id !== id) })),

      clearChecked: () => setState((s) => ({ shopping: s.shopping.filter((i) => !i.checked) })),

      loadDemo: () =>
        setState((s) => ({
          receipts: [...s.receipts.filter((r) => r.source !== "demo"), ...generateDemoReceipts()],
        })),

      removeDemo: () => setState((s) => ({ receipts: s.receipts.filter((r) => r.source !== "demo") })),

      importBackup: (backup) => {
        const { data } = backup;
        const known = new Set(getState().receipts.map((r) => r.id));
        const incoming = (data.receipts ?? []).filter((r) => !known.has(r.id));
        setState((s) => ({
          receipts: [...s.receipts, ...incoming],
          shopping: [...s.shopping, ...(data.shopping ?? []).filter((i) => !s.shopping.some((c) => c.id === i.id))],
          aliases: { ...s.aliases, ...data.aliases },
          names: { ...s.names, ...data.names },
          categories: { ...s.categories, ...data.categories },
        }));
        return incoming.length;
      },

      exportBackup: () => {
        const { receipts, shopping, aliases, names, categories } = getState();
        return {
          app: "cesta",
          version: 1,
          exportedAt: new Date().toISOString(),
          data: { receipts, shopping, aliases, names, categories },
        };
      },

      reset: () => setState({ ...empty }),
    }),
    {
      name: "cesta-data",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: ({ receipts, shopping, aliases, names, categories }) => ({
        receipts,
        shopping,
        aliases,
        names,
        categories,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Estado de interface que não precisa ser salvo */
type UI = {
  month: string | null;
  setMonth: (m: string) => void;
  toast: { id: number; text: string; tone: "ok" | "error" } | null;
  showToast: (text: string, tone?: "ok" | "error") => void;
};

export const useUI = create<UI>()((setState) => ({
  month: null,
  setMonth: (month) => setState({ month }),
  toast: null,
  showToast: (text, tone = "ok") => setState({ toast: { id: Date.now(), text, tone } }),
}));

export const toast = (text: string, tone?: "ok" | "error") => useUI.getState().showToast(text, tone);

/** Notas + produtos já consolidados + meses com dados (mais recente primeiro). */
export function useData() {
  const receipts = useStore((s) => s.receipts);
  const aliases = useStore((s) => s.aliases);
  const names = useStore((s) => s.names);
  const categories = useStore((s) => s.categories);
  const products = useMemo(
    () => buildProducts(receipts, { aliases, names, categories }),
    [receipts, aliases, names, categories],
  );
  const months = useMemo(() => monthsWithData(receipts), [receipts]);
  return { receipts, products, months };
}

/** Mês selecionado (compartilhado entre telas). Por padrão, o mês mais recente com nota. */
export function useMonth(months: string[]) {
  const selected = useUI((s) => s.month);
  const setMonth = useUI((s) => s.setMonth);
  const month = selected && months.includes(selected) ? selected : (months[0] ?? currentMonth());
  return [month, setMonth] as const;
}
