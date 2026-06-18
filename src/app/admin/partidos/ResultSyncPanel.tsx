"use client";

import { useState, useTransition } from "react";
import { adminSyncResults, adminAutoMapFixtures, adminSyncKickoffs } from "./sync-actions";
import { RefreshCw, Link2, Clock } from "lucide-react";

export function ResultSyncPanel() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function sync() {
    setMsg(null);
    start(async () => {
      const r = await adminSyncResults();
      if ("error" in r) { setMsg({ kind: "err", text: r.error ?? "Error" }); return; }
      setMsg({ kind: "ok", text: `Sincronizado: ${r.updated} actualizados de ${r.checked} mapeados (${r.finished} finalizados en la API).` });
    });
  }

  function map() {
    setMsg(null);
    start(async () => {
      const r = await adminAutoMapFixtures();
      if ("error" in r) { setMsg({ kind: "err", text: r.error ?? "Error" }); return; }
      if (r.fixtures === 0) {
        setMsg({ kind: "err", text: "La API devolvió 0 fixtures. Tu plan/temporada de API-Football probablemente no incluye el Mundial 2026 (el plan gratis suele dar solo temporadas viejas). Revisa la API key/plan." });
        return;
      }
      setMsg({
        kind: r.mapped > 0 ? "ok" : "err",
        text: `API: ${r.fixtures} fixtures (ej. ${r.sample.join(" · ")}). Mapeados ${r.mapped}.` +
          (r.mapped === 0 ? " Los nombres de la API no coinciden con tus equipos — mándame un ejemplo y ajusto el diccionario." : r.unmapped.length ? ` Sin mapear: M${r.unmapped.join(", M")}.` : " Todos mapeados."),
      });
    });
  }

  function fixTimes() {
    setMsg(null);
    start(async () => {
      const r = await adminSyncKickoffs();
      if ("error" in r) { setMsg({ kind: "err", text: r.error ?? "Error" }); return; }
      setMsg({ kind: "ok", text: `Horarios corregidos: ${r.updated} actualizados de ${r.checked} mapeados (desde ESPN).` });
    });
  }

  return (
    <div className="mb-4 rounded-lg border bg-white p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700 mr-1">Resultados automáticos</span>
      <button
        onClick={map}
        disabled={pending}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <Link2 size={13} /> Importar / mapear fixtures
      </button>
      <button
        onClick={fixTimes}
        disabled={pending}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <Clock size={13} /> Corregir horarios
      </button>
      <button
        onClick={sync}
        disabled={pending}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> Sincronizar ahora
      </button>
      {msg && (
        <span className={`text-xs ${msg.kind === "ok" ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>
      )}
    </div>
  );
}
