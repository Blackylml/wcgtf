"use client";

import { useState } from "react";
import { MatchPick } from "@/generated/prisma/client";
import { createMatchBet, deleteMatchBet } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { Check, Clock, Lock, Trash2 } from "lucide-react";

type Team = { name: string; flag: string | null; code: string } | null;

type Match = {
  id: string;
  matchNumber: number;
  homeTeam: Team;
  awayTeam: Team;
  homeLabel: string | null;
  awayLabel: string | null;
  stage: string;
  scheduledAt: Date;
  venue: string | null;
  isOpen: boolean;
  penaltiesAllowed: boolean;
  userBet: MatchPick | null;
  enabled: boolean;
};

const PICK_LABELS: Record<MatchPick, string> = { HOME: "Local", DRAW: "Empate", AWAY: "Visitante" };

export function MatchCard({ match }: { match: Match }) {
  const [pick, setPick] = useState<MatchPick | null>(match.userBet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const homeName = match.homeTeam?.name ?? match.homeLabel ?? "Por definir";
  const awayName = match.awayTeam?.name ?? match.awayLabel ?? "Por definir";

  const showDraw = match.stage === "GROUP" || match.penaltiesAllowed;
  const picks: MatchPick[] = ["HOME", ...(showDraw ? (["DRAW"] as MatchPick[]) : []), "AWAY"];

  const date = new Date(match.scheduledAt);
  const dateStr = date.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Monterrey" });
  const timeStr = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Monterrey" });

  const pickLabel = (p: MatchPick) => (p === "HOME" ? homeName : p === "AWAY" ? awayName : "Empate");

  async function handlePick(p: MatchPick) {
    setLoading(true); setError("");
    const result = await createMatchBet(match.id, p);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setPick(p);
  }

  async function handleDelete() {
    setLoading(true); setError("");
    const result = await deleteMatchBet(match.id);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setPick(null);
  }

  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full flex flex-col transition-opacity ${
        !match.isOpen && !pick ? "opacity-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 text-[11px]">
        <span className="font-mono font-semibold text-slate-500">M{match.matchNumber}</span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock size={11} />
          {dateStr} · {timeStr}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <FlagCircle flag={match.homeTeam?.flag} code={match.homeTeam?.code} size={40} ring="ring-white/12" />
          <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">{homeName}</span>
        </div>
        <span className="text-[10px] text-slate-600 font-display font-bold shrink-0">VS</span>
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <FlagCircle flag={match.awayTeam?.flag} code={match.awayTeam?.code} size={40} ring="ring-white/12" />
          <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">{awayName}</span>
        </div>
      </div>

      {/* Action */}
      {pick ? (
        <div className="mt-auto">
          <div className="flex items-center justify-center gap-1.5 bg-green-400/[0.1] border border-green-400/25 rounded-xl py-2.5">
            <Check size={13} className="text-green-400" />
            <span className="text-green-300 text-xs font-semibold truncate">{pickLabel(pick)}</span>
          </div>
          {match.isOpen && (
            <button onClick={handleDelete} disabled={loading} className="mt-2 flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={11} /> {loading ? "..." : "Cambiar"}
            </button>
          )}
        </div>
      ) : !match.isOpen ? (
        <div className="mt-auto flex items-center justify-center gap-1.5 text-xs text-slate-600 py-2">
          <Lock size={11} /> Cerrado
        </div>
      ) : !match.enabled ? (
        <div className="mt-auto flex items-center justify-center gap-1.5 text-xs text-slate-500 py-2 text-center">
          <Lock size={11} /> Entra a Partidos para apostar
        </div>
      ) : (
        <div className="mt-auto">
          <div className={`grid gap-2 ${picks.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {picks.map((p) => (
              <button
                key={p}
                onClick={() => handlePick(p)}
                disabled={loading}
                className="py-2 rounded-lg text-xs font-semibold text-slate-300 border border-white/10 bg-white/[0.02] hover:border-green-400/50 hover:text-green-300 hover:bg-green-400/10 transition-all disabled:opacity-40 active:scale-95"
              >
                {PICK_LABELS[p]}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
        </div>
      )}

      {error && pick && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
