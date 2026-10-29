"use client";

import type { ReaderOptions } from "zxing-wasm/reader";

type Detected = { rawValue: string };
type NativeDetector = { detect: (source: CanvasImageSource | ImageData) => Promise<Detected[]> };
type NativeDetectorCtor = {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

export type Decode = (frame: ImageData) => Promise<string | undefined>;

/**
 * Leitor nativo do navegador (Chrome no Android). O Safari/iPhone não tem,
 * por isso o padrão lá é o ZXing em WebAssembly.
 */
async function createNativeDecoder(): Promise<Decode | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = await Ctor.getSupportedFormats();
    if (!formats.includes("qr_code")) return null;
    const detector = new Ctor({ formats: ["qr_code"] });
    return async (frame) => (await detector.detect(frame))[0]?.rawValue;
  } catch {
    return null;
  }
}

/** ZXing: lida bem com QR Codes densos e pequenos, como os das notas fiscais impressas. */
const ZXING_OPTIONS: ReaderOptions = {
  formats: ["QRCode"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  tryDownscale: true,
  maxNumberOfSymbols: 1,
};

let zxingModule: Promise<typeof import("zxing-wasm/reader")> | null = null;

function loadZXing() {
  zxingModule ??= import("zxing-wasm/reader").then(async (m) => {
    // O .wasm é servido pelo próprio app (copiado para /public no postinstall)
    await m.prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/${path}` : prefix + path) },
      fireImmediately: true,
    });
    return m;
  });
  zxingModule.catch(() => {
    zxingModule = null;
  });
  return zxingModule;
}

async function createZXingDecoder(): Promise<Decode | null> {
  try {
    const zxing = await loadZXing();
    return async (frame) => {
      const results = await zxing.readBarcodes(frame, ZXING_OPTIONS);
      return results.find((r) => r.isValid && r.text)?.text;
    };
  } catch {
    return null;
  }
}

async function createJsQRDecoder(): Promise<Decode> {
  const jsQR = (await import("jsqr")).default;
  return async (frame) => jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" })?.data;
}

let decoderPromise: Promise<{ decode: Decode; engine: string }> | null = null;

/** Escolhe o melhor leitor disponível: nativo → ZXing (WASM) → jsQR. */
export function getDecoder() {
  decoderPromise ??= (async () => {
    const native = await createNativeDecoder();
    if (native) return { decode: native, engine: "nativo" };
    const zxing = await createZXingDecoder();
    if (zxing) return { decode: zxing, engine: "zxing" };
    return { decode: await createJsQRDecoder(), engine: "jsqr" };
  })();
  return decoderPromise;
}

/** Lê o QR Code de uma foto (galeria ou print), tentando alguns tamanhos. */
export async function decodeImageFile(file: File): Promise<string | null> {
  const img = await loadImage(file);
  const { decode } = await getDecoder();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  for (const max of [2000, 1200, 3000]) {
    const scale = Math.min(1, max / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const text = await decode(ctx.getImageData(0, 0, canvas.width, canvas.height)).catch(() => undefined);
    if (text) return text;
    if (scale === 1) break;
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
