"use client";

import { useState } from "react";
import { createGroupBet, getGroupMPUrl, deleteGroupBet } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { BetPayPhases } from "@/components/BetPayPhases";
import { Check, Lock, RotateCcw } from "lucide-react";

type Team = { id: string; name: string; code: string; flag: string | null };
type Bet = { teamId: string; position: number };
type Phase = "pick" | "pay" | "pending" | "paid";

const POS_STYLE: Record<number, string> = {
  1: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  2: "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  3: "bg-orange-700/20 text-orange-300 ring-orange-600/30",
  4: "bg-white/[0.06] text-slate-400 ring-white/15",
};

function initPhase(hasBet: boolean, paymentStatus: string | null, price: number): Phase {
  if (!hasBet) return "pick";
  if (price === 0 || paymentStatus === "APPROVED") return "paid";
  if (paymentStatus === "PENDING") return "pay";
  return "paid";
}

export function GroupCard({
  groupPoolId, groupName, price, isOpen, teams, existingBets, paymentStatus,
}: {
  groupPoolId: string; groupName: string; price: number; isOpen: boolean;
  teams: Team[]; existingBets: Bet[]; paymentStatus: string | null;
}) {
  const hasBet = existingBets.length > 0;
  const [phase, setPhase] = useState<Phase>(() => initPhase(hasBet, paymentStatus, price));
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rankedCount = Object.keys(ranks).length;
  const usedPositions = Object.values(ranks);
  const nextRank = [1, 2, 3, 4].find((r) => !usedPositions.includes(r));
  const allRanked = rankedCount === 4;

  function toggleTeam(id: string) {
    setError("");
    setRanks((prev) => {
      if (prev[id]) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
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
    setPhase(result.price === 0 ? "paid" : "pay");
  }

  async function handleMP() {
    setLoading(true); setError("");
    const result = await getGroupMPUrl(groupPoolId);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    if (result.redirectUrl) window.location.href = result.redirectUrl;
  }

  async function handleDelete() {
    setLoading(true); setError("");
    const result = await deleteGroupBet(groupPoolId);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setRanks({});
    setPhase("pick");
  }

  // Selection rows for the recap (paid/pending/pay), or the live pick
  const selectionRows = (hasBet && phase !== "pick"
    ? [...existingBets].sort((a, b) => a.position - b.position).map((b) => ({ position: b.position, team: teams.find((t) => t.id === b.teamId) }))
    : Object.entries(ranks).map(([teamId, position]) => ({ position, team: teams.find((t) => t.id === teamId) })).sort((a, b) => a.position - b.position)
  );

  const recap = (
    <div className="space-y-1.5">
      {selectionRows.map(({ position, team }) => (
        <div key={position} className="flex items-center gap-2 text-sm">
          <span className={`grid place-items-center w-5 h-5 rounded-md text-[10px] font-bold ring-1 shrink-0 ${POS_STYLE[position]}`}>{position}</span>
          <FlagCircle flag={team?.flag} code={team?.code} size={20} />
          <span className="text-slate-200 truncate">{team?.name ?? "—"}</span>
        </div>
      ))}
    </div>
  );

  const cardBase = "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full flex flex-col";

  // Closed and no bet
  if (phase === "pick" && !isOpen) {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-display text-sm font-bold text-white">Grupo {groupName}</span>
        {price > 0 && phase === "pick" && (
          <span className="text-amber-300 text-[11px] font-semibold bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
            ${price} MXN
          </span>
        )}
      </div>

      {phase === "pick" ? (
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">Toca los equipos en orden: 1° → 4°</p>
            {rankedCount > 0 && (
              <button
                onClick={() => setRanks({})}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
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
            {loading ? "Guardando..." : allRanked ? (price > 0 ? `Confirmar · $${price}` : "Confirmar apuesta") : `Faltan ${4 - rankedCount}`}
          </button>
        </div>
      ) : (
        <BetPayPhases
          phase={phase}
          price={price}
          recap={recap}
          onMP={handleMP}
          onChoosePending={() => setPhase("pending")}
          onChoosePay={() => setPhase("pay")}
          onDelete={handleDelete}
          loading={loading}
          error={error}
          isOpen={isOpen}
        />
      )}
    </div>
  );
}
