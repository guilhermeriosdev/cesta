import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cesta — seu mercado mês a mês",
    short_name: "Cesta",
    description: "Escaneie a nota fiscal do mercado e compare seus gastos mês a mês, produto por produto.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    lang: "pt-BR",
    categories: ["finance", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atalhos ao segurar o ícone (Android/Chrome) — o mais perto de widget que um app web tem
    shortcuts: [
      { name: "Escanear nota", short_name: "Escanear", url: "/escanear", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
      { name: "Lista de compras", short_name: "Lista", url: "/lista", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
    ],
  };
}
