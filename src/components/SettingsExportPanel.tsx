"use client";

import { useRef, useState } from "react";

import Notice from "@/components/Notice";
import { useSettingsExport } from "@/lib/useSettingsExport";

export default function SettingsExportPanel() {
  const { exportAll, importAll } = useSettingsExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importAll(file);
      setImportStatus("success");
      setTimeout(() => setImportStatus("idle"), 2000);
    } catch {
      setImportStatus("error");
      setTimeout(() => setImportStatus("idle"), 2000);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">Exportar/Importar Configurações</div>
      <p className="mt-2 text-sm text-slate-600">
        Salve ou restaure configurações, comentários e anúncios via JSON.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <button
            type="button"
            onClick={exportAll}
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Exportar tudo (JSON)
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Baixa um arquivo com configurações, comentários e overrides.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Importar de arquivo
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Restaura configurações e dados de um backup anterior.
          </p>
        </div>
      </div>

      {importStatus === "success" && (
        <Notice title="Importado" variant="success" className="mt-4">
          Dados importados com sucesso. Recarregue a página para ver as alterações.
        </Notice>
      )}

      {importStatus === "error" && (
        <Notice title="Erro" variant="warning" className="mt-4">
          Falha ao importar. Verifique se o arquivo é um JSON válido.
        </Notice>
      )}

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
        <strong>Atenção:</strong> Isso substitui configurações e dados locais. Use com cuidado.
      </div>
    </div>
  );
}
