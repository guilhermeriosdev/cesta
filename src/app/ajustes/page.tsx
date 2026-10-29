"use client";

import { Database, Download, LayoutGrid, Share, Smartphone, Sparkles, Trash, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { ConfirmSheet, Sheet } from "@/components/Sheet";
import { IconTile, List, Row, Section, Segmented } from "@/components/ui";
import { toast, useStore, type Backup } from "@/lib/store";
import { usePro } from "@/lib/pro";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";

export default function SettingsPage() {
  const [theme, setThemeState] = useState<ThemePref>(getThemePref);
  const receipts = useStore((s) => s.receipts);
  const pro = usePro();
  const hasDemo = receipts.some((r) => r.source === "demo");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<null | "reset" | "demo">(null);
  const [install, setInstall] = useState(false);

  const setTheme = (t: ThemePref) => {
    setThemeState(t);
    setThemePref(t);
  };

  const exportData = () => {
    const backup = useStore.getState().exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cesta-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as Backup;
      if (backup?.app !== "cesta" || !Array.isArray(backup.data?.receipts)) throw new Error("formato");
      const n = useStore.getState().importBackup(backup);
      toast(n ? `${n} notas importadas` : "Nenhuma nota nova no backup");
    } catch {
      toast("Arquivo de backup inválido");
    }
  };

  return (
    <Screen title="Ajustes" back={{ href: "/", label: "Resumo" }}>
      <Section title={<span className="text-[17px]">Aparência</span>} className="mt-2">
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "Automático" },
            { value: "light", label: "Claro" },
            { value: "dark", label: "Escuro" },
          ]}
        />
      </Section>

      <Section
        title={<span className="text-[17px]">Seus dados</span>}
        footer="Tudo fica salvo só neste aparelho. Faça um backup de vez em quando para não perder seu histórico."
      >
        <List>
          <Row icon={<IconTile icon={Download} color="#007AFF" />} title="Exportar backup" onClick={exportData} chevron />
          <Row icon={<IconTile icon={Upload} color="#34C759" />} title="Importar backup" onClick={() => fileRef.current?.click()} chevron />
          {hasDemo ? (
            <Row icon={<IconTile icon={Sparkles} color="#FF9500" />} title="Remover dados de exemplo" onClick={() => setConfirm("demo")} />
          ) : (
            <Row
              icon={<IconTile icon={Sparkles} color="#FF9500" />}
              title="Carregar dados de exemplo"
              onClick={() => {
                useStore.getState().loadDemo();
                toast("Dados de exemplo carregados");
              }}
            />
          )}
          <Row icon={<IconTile icon={Trash} color="#FF3B30" />} title="Apagar tudo" destructive onClick={() => setConfirm("reset")} />
        </List>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = "";
          }}
        />
      </Section>

      <Section title={<span className="text-[17px]">App</span>}>
        <List>
          <Row
            href="/pro"
            icon={<IconTile icon={Sparkles} color="#FF2D55" />}
            title="Cesta Pro"
            value={
              <span className="text-[15px] font-normal text-label-2">
                {pro.paid ? "Ativo" : pro.trialActive ? "Em teste" : "Grátis"}
              </span>
            }
            chevron
          />
          <Row icon={<IconTile icon={Smartphone} color="#5856D6" />} title="Instalar na tela de início" onClick={() => setInstall(true)} chevron />
          <Row
            icon={<IconTile icon={Database} color="#8E8E93" />}
            title="Notas salvas"
            value={<span className="text-[15px] font-normal text-label-2">{receipts.length}</span>}
          />
        </List>
      </Section>

      <p className="mt-10 text-center text-[13px] leading-relaxed text-label-3">
        Cesta · versão 0.1
        <br />
        Os dados das notas vêm dos portais públicos da SEFAZ.
      </p>

      <ConfirmSheet
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        title="Apagar tudo?"
        message="Todas as notas, nomes personalizados e a lista de compras serão apagados deste aparelho."
        confirmLabel="Apagar tudo"
        onConfirm={() => {
          useStore.getState().reset();
          toast("Tudo apagado");
        }}
      />
      <ConfirmSheet
        open={confirm === "demo"}
        onClose={() => setConfirm(null)}
        title="Remover exemplos?"
        message="Só as notas de exemplo serão apagadas. Suas notas reais continuam."
        confirmLabel="Remover exemplos"
        onConfirm={() => {
          useStore.getState().removeDemo();
          toast("Exemplos removidos");
        }}
      />

      <Sheet open={install} onClose={() => setInstall(false)} title="Instalar o Cesta">
        <div className="space-y-4 px-1 pb-2 text-[15px] leading-snug">
          <Step n={1} icon={Share}>
            No iPhone, abra no <b>Safari</b> e toque em <b>Compartilhar</b>.
          </Step>
          <Step n={2} icon={LayoutGrid}>
            Escolha <b>Adicionar à Tela de Início</b>. No Android, use o menu <b>⋮ → Instalar app</b>.
          </Step>
          <p className="rounded-[14px] bg-card p-3.5 text-[13px] text-label-2">
            Instalado, ele abre em tela cheia como um app. No Android, segure o ícone para atalhos rápidos de “Escanear” e “Lista”.
            Widgets de verdade na tela de início exigem uma versão nativa (próximo passo do projeto).
          </p>
        </div>
      </Sheet>
    </Screen>
  );
}

function Step({ n, icon: Icon, children }: { n: number; icon: typeof Share; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-card font-bold">{n}</div>
      <div className="flex-1 pt-1.5">{children}</div>
      <Icon size={20} className="mt-1.5 shrink-0 text-label-2" />
    </div>
  );
}
