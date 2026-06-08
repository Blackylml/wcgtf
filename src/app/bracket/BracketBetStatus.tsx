"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBracketBet } from "./actions";
import { Trash2 } from "lucide-react";

/** Botón para borrar el bracket enviado y volver a llenarlo (si la sesión sigue abierta). */
export function BracketCancel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onCancel() {
    setLoading(true); setError("");
    const r = await deleteBracketBet();
    setLoading(false);
    if (r?.error) { setError(r.error); return; }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        onClick={onCancel}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors"
      >
        <Trash2 size={12} /> {loading ? "Borrando..." : "Cambiar bracket"}
      </button>
      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
