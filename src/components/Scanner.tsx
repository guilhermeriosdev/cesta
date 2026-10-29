"use client";

import { CameraOff, Flashlight, FlashlightOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createNativeDetector, loadJsQR } from "@/lib/qr";
import { cn } from "./ui";

type Status = "starting" | "running" | "denied" | "unavailable";

/**
 * Câmera traseira + leitura contínua de QR Code. Só decodifica quando `active`
 * é verdadeiro (assim a câmera continua aberta atrás da prévia da nota).
 */
export function Scanner({ active, onResult }: { active: boolean; onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const activeRef = useRef(active);
  const onResultRef = useRef(onResult);
  const [status, setStatus] = useState<Status>("starting");
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });

  useEffect(() => {
    activeRef.current = active;
    onResultRef.current = onResult;
  }, [active, onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let busy = false;
    let last = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
      if (caps.torch) setTorch({ supported: true, on: false });
      if (caps.focusMode?.includes("continuous")) {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
      }

      const native = await createNativeDetector();
      const jsQR = native ? null : await loadJsQR();
      setStatus("running");

      const tick = async (time: number) => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        if (!activeRef.current || busy || time - last < 110 || video.readyState < 2) return;
        last = time;
        busy = true;
        try {
          let text: string | undefined;
          if (native) {
            text = (await native.detect(video))[0]?.rawValue;
          } else if (jsQR && ctx) {
            // Recorta o quadrado central (onde fica a moldura) para ler mais rápido
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const side = Math.min(vw, vh) * 0.85;
            const size = Math.min(720, Math.round(side));
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
            const img = ctx.getImageData(0, 0, size, size);
            text = jsQR(img.data, size, size, { inversionAttempts: "dontInvert" })?.data;
          }
          if (text && activeRef.current) onResultRef.current(text);
        } catch {
          // frame ruim, tenta o próximo
        } finally {
          busy = false;
        }
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, []);

  const toggleTorch = async () => {
    const on = !torch.on;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {(status === "denied" || status === "unavailable") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-[20px] bg-white/10">
            <CameraOff size={28} className="text-white/80" />
          </div>
          <p className="text-[17px] font-semibold">
            {status === "denied" ? "Sem acesso à câmera" : "Câmera indisponível"}
          </p>
          <p className="mt-1.5 text-[15px] leading-snug text-white/60">
            {status === "denied"
              ? "Libere a câmera nos ajustes do navegador ou use uma foto da nota."
              : "Use uma foto do QR Code ou cole o link da nota."}
          </p>
        </div>
      )}

      {status !== "denied" && status !== "unavailable" && (
        <div
          className={cn(
            "absolute top-[44%] left-1/2 aspect-square w-[72vw] max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[40px] transition-opacity duration-300",
            active ? "opacity-100" : "opacity-0",
          )}
          style={{ boxShadow: "0 0 0 200vmax rgba(0,0,0,0.5)" }}
        >
          {/* cantos da moldura */}
          {["top-0 left-0 border-t-[4px] border-l-[4px] rounded-tl-[40px]", "top-0 right-0 border-t-[4px] border-r-[4px] rounded-tr-[40px]", "bottom-0 left-0 border-b-[4px] border-l-[4px] rounded-bl-[40px]", "bottom-0 right-0 border-b-[4px] border-r-[4px] rounded-br-[40px]"].map((c) => (
            <span key={c} className={cn("absolute size-14 border-white", c)} />
          ))}
          <span
            className="scan-line absolute inset-x-8 top-6 h-[2px] rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]"
            style={{ ["--travel" as string]: "calc(min(72vw, 300px) - 48px)" }}
          />
        </div>
      )}

      {torch.supported && active && (
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={torch.on ? "Desligar lanterna" : "Ligar lanterna"}
          className={cn(
            "pressable absolute top-[calc(44%+min(36vw,150px)+28px)] left-1/2 grid size-12 -translate-x-1/2 place-items-center rounded-full backdrop-blur-xl",
            torch.on ? "bg-white text-black" : "bg-white/15 text-white",
          )}
        >
          {torch.on ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
        </button>
      )}
    </div>
  );
}
