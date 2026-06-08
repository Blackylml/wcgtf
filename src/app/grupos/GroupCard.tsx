"use client";

import { useState } from "react";
import { createGroupBet, deleteGroupBet } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { Check, Lock, RotateCcw, Trash2 } from "lucide-react";

type Team = { id: string; name: string; code: string; flag: string | null };
type Bet = { teamId: string; position: number };

const POS_STYLE: Record<number, string> = {
  1: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  2: "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  3: "bg-orange-700/20 text-orange-300 ring-orange-600/30",
  4: "bg-white/[0.06] text-slate-400 ring-white/15",
};

export function GroupCard({
  groupPoolId, groupName, isOpen, enabled, teams, existingBets,
}: {
  groupPoolId: string; groupName: string; isOpen: boolean; enabled: boolean;
  teams: Team[]; existingBets: Bet[];
}) {
  const [done, setDone] = useState(existingBets.length > 0);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rankedCount = Object.keys(ranks).length;
  const nextRank = [1, 2, 3, 4].find((r) => !Object.values(ranks).includes(r));
  const allRanked = rankedCount === 4;

  function toggleTeam(id: string) {
    setError("");
    setRanks((prev) => {
      if (prev[id]) { const c = { ...prev }; delete c[id]; return c; }
      if (!nextRank) return prev;
      return { ...prev, [id]: nextRank };
    });
  }

  async function handleConfirm() {
    const predictions = Object.entries(ranks).map(([teamId, position]) => ({ teamId, position }));
    if (predictions.length !== 4) { setError("Asigna las 4 posiciones"); return; }
    setLoading(true); setError("");
    const result = await createGroupBet(groupPoolId, predictions);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setDone(true);
  }

  async function handleDelete() {
    setLoading(true); setError("");
    const result = await deleteGroupBet(groupPoolId);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setRanks({});
    setDone(false);
  }

  const selectionRows = (done && existingBets.length > 0
    ? [...existingBets].sort((a, b) => a.position - b.position).map((b) => ({ position: b.position, team: teams.find((t) => t.id === b.teamId) }))
    : Object.entries(ranks).map(([teamId, position]) => ({ position, team: teams.find((t) => t.id === teamId) })).sort((a, b) => a.position - b.position)
  );

  const cardBase = "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full flex flex-col";

  // Already submitted
  if (done) {
    return (
      <div className={cardBase}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-sm font-bold text-white">Grupo {groupName}</span>
          <span className="flex items-center gap-1 text-green-300 text-[11px] font-semibold bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
            <Check size={11} /> Apostado
          </span>
        </div>
        <div className="space-y-1.5">
          {selectionRows.map(({ position, team }) => (
            <div key={position} className="flex items-center gap-2.5 text-sm">
              <span className={`grid place-items-center w-5 h-5 rounded-md text-[10px] font-bold ring-1 shrink-0 ${POS_STYLE[position]}`}>{position}</span>
              <FlagCircle flag={team?.flag} code={team?.code} size={22} />
              <span className="text-slate-200 truncate">{team?.name ?? "—"}</span>
            </div>
          ))}
        </div>
        {isOpen && (
          <button onClick={handleDelete} disabled={loading} className="mt-3 flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 size={11} /> {loading ? "..." : "Cambiar apuesta"}
          </button>
        )}
        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      </div>
    );
  }

  // Closed (no bet)
  if (!isOpen) {
    return (
      <div className={`${cardBase} opacity-60`}>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-slate-400">Grupo {groupName}</span>
          <Lock size={13} className="text-slate-600" />
        </div>
        <p className="text-xs text-slate-600 mt-3">Aún no está abierto</p>
      </div>
    );
  }

  // Not entered yet → locked until module entry
  if (!enabled) {
    return (
      <div className={`${cardBase} opacity-70`}>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-slate-300">Grupo {groupName}</span>
          <Lock size={13} className="text-slate-500" />
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">Paga la entrada arriba para apostar en este grupo.</p>
      </div>
    );
  }

  // Pick (enabled + open + no bet)
  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-display text-sm font-bold text-white">Grupo {groupName}</span>
      </div>

      <div className="space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400">Toca los equipos en orden: 1° → 4°</p>
          {rankedCount > 0 && (
            <button onClick={() => setRanks({})} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
              <RotateCcw size={11} /> Reiniciar
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {teams.map((t) => {
            const r = ranks[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTeam(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all active:scale-[0.99] ${
                  r ? "bg-green-400/10 border-green-400/40" : "bg-black/20 border-white/10 hover:border-white/25"
                }`}
              >
                <span className={`grid place-items-center w-6 h-6 rounded-lg text-[11px] font-bold ring-1 shrink-0 ${r ? POS_STYLE[r] : "bg-white/[0.04] text-slate-600 ring-white/10"}`}>
                  {r ?? "·"}
                </span>
                <FlagCircle flag={t.flag} code={t.code} size={22} />
                <span className="text-sm text-slate-200 truncate flex-1 text-left">{t.name}</span>
                {r && <Check size={14} className="text-green-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading || !allRanked}
          className="mt-auto w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-40 active:scale-[0.98] shadow-[0_8px_24px_-10px_rgba(34,224,122,0.7)]"
        >
          {loading ? "Guardando..." : allRanked ? "Confirmar apuesta" : `Faltan ${4 - rankedCount}`}
        </button>
      </div>
    </div>
  );
}
