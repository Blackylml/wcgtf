"use client";

import { useState } from "react";
import { submitGroupBet } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { Check, Lock, ChevronDown } from "lucide-react";

type Team = { id: string; name: string; code: string; flag: string | null };
type Bet = { teamId: string; position: number };

const POS_STYLE: Record<number, string> = {
  1: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  2: "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  3: "bg-orange-700/20 text-orange-300 ring-orange-600/30",
  4: "bg-white/[0.06] text-slate-400 ring-white/15",
};

export function GroupCard({
  groupPoolId, groupName, price, isOpen, teams, existingBets,
}: {
  groupPoolId: string; groupName: string; price: number; isOpen: boolean;
  teams: Team[]; existingBets: Bet[];
}) {
  const hasBet = existingBets.length > 0;
  const [positions, setPositions] = useState<Record<number, string>>({ 1: "", 2: "", 3: "", 4: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const usedTeams = Object.values(positions).filter(Boolean);
  const availableFor = (pos: number) =>
    teams.filter((t) => !usedTeams.includes(t.id) || positions[pos] === t.id);

  async function handleSubmit() {
    const predictions = [1, 2, 3, 4].map((pos) => ({ position: pos, teamId: positions[pos] }));
    if (predictions.some((p) => !p.teamId)) { setError("Completa las 4 posiciones"); return; }
    setLoading(true); setError("");
    const result = await submitGroupBet(groupPoolId, predictions);
    setLoading(false);
    if (result?.error) setError(result.error);
    else if (result?.redirectUrl) window.location.href = result.redirectUrl;
    else setSuccess(true);
  }

  const cardBase = "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full";

  // Submitted state
  if (hasBet || success) {
    const bets = hasBet ? existingBets : Object.entries(positions).map(([p, t]) => ({ position: Number(p), teamId: t }));
    return (
      <div className={cardBase}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-sm font-bold text-white">Grupo {groupName}</span>
          <span className="flex items-center gap-1 text-green-300 text-[11px] font-semibold bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
            <Check size={11} /> Apostado
          </span>
        </div>
        <div className="space-y-2">
          {[...bets].sort((a, b) => a.position - b.position).map((b) => {
            const team = teams.find((t) => t.id === b.teamId);
            return (
              <div key={b.position} className="flex items-center gap-2.5 text-sm">
                <span className={`grid place-items-center w-6 h-6 rounded-lg text-[11px] font-bold ring-1 ${POS_STYLE[b.position]}`}>
                  {b.position}
                </span>
                <FlagCircle flag={team?.flag} code={team?.code} size={24} />
                <span className="text-slate-200 truncate">{team?.name ?? "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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

  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-sm font-bold text-white">Grupo {groupName}</span>
        {price > 0 && (
          <span className="text-amber-300 text-[11px] font-semibold bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
            ${price} MXN
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {[1, 2, 3, 4].map((pos) => (
          <div key={pos} className="flex items-center gap-2.5">
            <span className={`grid place-items-center w-6 h-6 rounded-lg text-[11px] font-bold ring-1 shrink-0 ${POS_STYLE[pos]}`}>
              {pos}
            </span>
            <div className="relative flex-1">
              <select
                className="w-full appearance-none bg-black/30 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-200 focus:border-green-400/50 focus:ring-2 focus:ring-green-400/15 focus:outline-none transition-colors"
                value={positions[pos]}
                onChange={(e) => setPositions((prev) => ({ ...prev, [pos]: e.target.value }))}
              >
                <option value="">— Seleccionar —</option>
                {availableFor(pos).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-40 active:scale-[0.98] shadow-[0_8px_24px_-10px_rgba(34,224,122,0.7)]"
      >
        {loading ? "Guardando..." : "Confirmar apuesta"}
      </button>
    </div>
  );
}
