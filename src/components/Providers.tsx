"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { applyTheme, watchSystemTheme } from "@/lib/theme";
import { TabBar } from "./TabBar";
import { Toast } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    // O tema é aplicado antes do conteúdo aparecer (ele só renderiza depois de ler o IndexedDB)
    applyTheme();
    const stopWatching = watchSystemTheme();
    useStore.persist.rehydrate();
    // Pede ao navegador para não apagar os dados locais quando faltar espaço
    navigator.storage?.persist?.().catch(() => {});
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return stopWatching;
  }, []);

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md">{hydrated ? children : null}</main>
      {hydrated && <TabBar />}
      <Toast />
    </>
  );
}
