"use client";

type Detected = { rawValue: string };
type Detector = { detect: (source: CanvasImageSource | ImageBitmap) => Promise<Detected[]> };
type DetectorCtor = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};

/** Usa o leitor nativo do navegador quando existe (Chrome/Android); senão, cai para o jsQR. */
export async function createNativeDetector(): Promise<Detector | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = await Ctor.getSupportedFormats();
    return formats.includes("qr_code") ? new Ctor({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

export async function loadJsQR() {
  return (await import("jsqr")).default;
}

/** Lê o QR Code de uma foto (galeria ou print). */
export async function decodeImageFile(file: File): Promise<string | null> {
  const img = await loadImage(file);
  const native = await createNativeDetector();
  if (native) {
    try {
      const found = await native.detect(img);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {
      // segue para o jsQR
    }
  }
  const jsQR = await loadJsQR();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  for (const max of [1400, 900, 2200]) {
    const scale = Math.min(1, max / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    if (result?.data) return result.data;
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
