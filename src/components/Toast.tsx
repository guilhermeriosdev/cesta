"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

export function Toast() {
  const toast = useUI((s) => s.toast);
  const [visible, setVisible] = useState<typeof toast>(null);

  useEffect(() => {
    if (!toast) return;
    setVisible(toast);
    const t = setTimeout(() => setVisible(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!visible) return null;
  return (
    <div
      key={visible.id}
      role="status"
      className="toast-in fixed left-1/2 z-[60] flex max-w-[88vw] items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2.5 text-[15px] font-semibold shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      style={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
    >
      {visible.tone === "error" ? (
        <CircleAlert size={18} className="shrink-0 text-up" />
      ) : (
        <CircleCheck size={18} className="shrink-0 text-down" />
      )}
      <span className="truncate">{visible.text}</span>
    </div>
  );
}
