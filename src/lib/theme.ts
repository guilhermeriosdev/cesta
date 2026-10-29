"use client";

export type ThemePref = "system" | "light" | "dark";

const KEY = "cesta-theme";
const query = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

/** Liga a classe `dark` no <html> conforme a escolha (ou o sistema) e ajusta a cor da barra do navegador. */
export function applyTheme() {
  const pref = getThemePref();
  const dark = pref === "dark" || (pref === "system" && query().matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = dark ? "#000000" : "#f2f2f7";
}

export function setThemePref(pref: ThemePref) {
  localStorage.setItem(KEY, pref);
  applyTheme();
}

export function watchSystemTheme() {
  const m = query();
  m.addEventListener("change", applyTheme);
  return () => m.removeEventListener("change", applyTheme);
}
