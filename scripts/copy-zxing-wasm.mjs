// Copia o motor de leitura de QR Code (ZXing em WebAssembly) para /public,
// assim o app não depende de CDN e funciona offline. Roda sozinho após `npm install`.
import { copyFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const dest = new URL("../public/zxing_reader.wasm", import.meta.url);

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log("zxing_reader.wasm copiado para public/");
}
