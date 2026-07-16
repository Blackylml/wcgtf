"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MatchPick, Module } from "@/generated/prisma/client";
import { saveQuinielaBets, saveKoTiebreaker } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import type { ModuleAccent } from "@/lib/modules";
import { Lock, Clock, Trophy, ShieldAlert } from "lucide-react";
import type { QuinielaStanding } from "@/lib/module-access";

export type QMatch = {
  id: string;
  matchNumber: number;
  homeName: string; homeFlag: string | null; homeCode: string | null;
  awayName: string; awayFlag: string | null; awayCode: string | null;
  userBet: MatchPick | null;
  allowDraw?: boolean; // false en KO sin penales
  halfLabel?: "1T" | "FT"; // picks de desempate: primer tiempo / resultado final
};

type Access = { price: number; paymentStatus: string | null; entryOpen: boolean; entered: boolean };

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 17;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const complete = total > 0 && done >= total;
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
      <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle
        cx="23" cy="23" r={r} fill="none"
        stroke={complete ? "#22e07a" : "#3b9dff"} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        transform="rotate(-90 23 23)" className="transition-all duration-300"
      />
      {complete ? (
        <g transform="translate(15 15)"><path d="M2 8 l4 4 l8 -9" fill="none" stroke="#22e07a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
      ) : (
        <text x="23" y="23" textAnchor="middle" dominantBaseline="central" className="fill-white font-bold" style={{ fontSize: 12 }}>{done}</text>
      )}
    </svg>
  );
}

type TiebreakerPrediction = { topScorerTeam: string | null; firstHalfGoals: number | null; earliestGoalTeam: string | null };
type TeamOption = { code: string; name: string; flag: string | null };

export function QuinielaSection({
  module, label, accent, matches, access, locked, lockLabel, standing, teams, savedTiebreaker, userCredits,
}: {
  module: Module;
  label: string;
  accent: ModuleAccent;
  matches: QMatch[];
  access: Access;
  locked: boolean;
  lockLabel: string;
  standing: QuinielaStanding | null;
  teams?: TeamOption[];
  savedTiebreaker?: TiebreakerPrediction | null;
  userCredits?: number;
}) {
  const router = useRouter();
  const [tb, setTb] = useState<TiebreakerPrediction>({
    topScorerTeam: savedTiebreaker?.topScorerTeam ?? null,
    firstHalfGoals: savedTiebreaker?.firstHalfGoals ?? null,
    earliestGoalTeam: savedTiebreaker?.earliestGoalTeam ?? null,
  });
  const [savedTb, setSavedTb] = useState<TiebreakerPrediction>({
    topScorerTeam: savedTiebreaker?.topScorerTeam ?? null,
    firstHalfGoals: savedTiebreaker?.firstHalfGoals ?? null,
    earliestGoalTeam: savedTiebreaker?.earliestGoalTeam ?? null,
  });
  const [tbLoading, setTbLoading] = useState(false);
  const [tbError, setTbError] = useState("");

  const init = () => {
    const m: Record<string, MatchPick> = {};
    for (const x of matches) if (x.userBet) m[x.id] = x.userBet;
    return m;
  };
  const [picks, setPicks] = useState<Record<string, MatchPick>>(init);
  const [saved, setSaved] = useState<Record<string, MatchPick>>(init);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // En quiniela, todos los partidos de la jornada se eligen mientras no esté cerrada
  // (el cierre por tiempo gobierna, no el isOpen individual de cada partido).
  const done = matches.filter((m) => picks[m.id]).length;
  const allPicked = matches.length > 0 && matches.every((m) => picks[m.id]);
  const changed = matches.some((m) => picks[m.id] && picks[m.id] !== saved[m.id]);
  const missing = matches.filter((m) => !picks[m.id]).length;

  const interactable = access.entered && !locked;

  function choose(id: string, pick: MatchPick) {
    if (!interactable) return;
    setError("");
    setPicks((p) => ({ ...p, [id]: pick }));
  }

  async function confirm() {
    setLoading(true); setError("");
    const payload = matches.filter((m) => picks[m.id]).map((m) => ({ matchId: m.id, pick: picks[m.id] }));
    const res = await saveQuinielaBets(module, payload);
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setSaved({ ...picks });
    router.refresh();
  }

  const fullyConfirmed = allPicked && !changed;

  return (
    <section className="animate-rise mb-7 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <ProgressRing done={done} total={matches.length} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-white leading-tight">{label}</h2>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
            <span>{done}/{matches.length}</span>
            <span className="text-slate-700">·</span>
            {locked ? (
              <span className="inline-flex items-center gap-1 text-red-300/90 font-medium"><Lock size={10} /> Cerrada</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500"><Clock size={10} /> cierra {lockLabel}</span>
            )}
          </p>
        </div>
        {access.price > 0 && !access.entered && !locked && (
          <span className="text-amber-300 text-sm font-bold tabular-nums shrink-0">${access.price}</span>
        )}
        {access.entered && standing && (
          standing.ranked ? (
            <span className="flex items-center gap-1 text-amber-200 text-[11px] font-semibold bg-amber-400/10 border border-amber-400/25 rounded-full px-2.5 py-1 shrink-0">
              <Trophy size={11} /> #{standing.rank} <span className="text-amber-300/60 font-normal">de {standing.total}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1 shrink-0">{standing.total} jugando</span>
          )
        )}
      </div>

      {/* Entry gate (pago de la quiniela) */}
      <ModuleEntryGate
        module={module}
        label={label}
        accent={accent}
        price={access.price}
        paymentStatus={access.paymentStatus}
        entryOpen={access.entryOpen && !locked}
        userCredits={userCredits}
      />

      {/* Match rows */}
      <div className={`rounded-xl border border-white/[0.06] overflow-hidden ${!interactable ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {matches.map((m) => {
          const sel = picks[m.id];
          return (
            <div key={m.id} className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.05] last:border-0 ${m.halfLabel ? "py-2" : ""}`}>
              {m.halfLabel ? (
                <span className={`text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-full w-[26px] text-center leading-tight ${
                  m.halfLabel === "1T"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/35"
                }`}>
                  {m.halfLabel}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-slate-600 w-4 shrink-0">{m.matchNumber}</span>
              )}

              {/* Local gana */}
              <button
                type="button"
                onClick={() => choose(m.id, "HOME")}
                className={`flex items-center justify-end gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                  sel === "HOME" ? "bg-blue-500/15 border-blue-400/50" : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <span className={`text-[11px] truncate text-right ${sel === "HOME" ? "text-white font-semibold" : "text-slate-300"}`}>{m.homeName}</span>
                <FlagCircle flag={m.homeFlag} code={m.homeCode} size={22} ring={sel === "HOME" ? "ring-blue-400/70" : "ring-white/12"} />
              </button>

              {/* Empate — solo si aplica */}
              {(m.allowDraw ?? true) && (
                <button
                  type="button"
                  onClick={() => choose(m.id, "DRAW")}
                  className={`w-9 h-9 shrink-0 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${
                    sel === "DRAW"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_-4px_rgba(59,157,255,0.9)]"
                      : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  E
                </button>
              )}

              {/* Visitante gana */}
              <button
                type="button"
                onClick={() => choose(m.id, "AWAY")}
                className={`flex items-center justify-start gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                  sel === "AWAY" ? "bg-blue-500/15 border-blue-400/50" : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <FlagCircle flag={m.awayFlag} code={m.awayCode} size={22} ring={sel === "AWAY" ? "ring-blue-400/70" : "ring-white/12"} />
                <span className={`text-[11px] truncate ${sel === "AWAY" ? "text-white font-semibold" : "text-slate-300"}`}>{m.awayName}</span>
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

      {/* Confirm */}
      {access.entered && !locked && (
        <button
          onClick={confirm}
          disabled={loading || !allPicked || fullyConfirmed}
          className={`mt-3 w-full font-semibold rounded-xl py-3 text-sm transition-all active:scale-[0.98] ${
            fullyConfirmed
              ? "bg-green-400/10 text-green-300 border border-green-400/25"
              : allPicked
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-[0_8px_24px_-10px_rgba(59,157,255,0.8)]"
                : "bg-white/[0.04] text-slate-500 border border-white/10"
          }`}
        >
          {loading ? "Guardando..." : fullyConfirmed ? "✓ Quiniela completa" : allPicked ? "Confirmar quiniela" : `Faltan ${missing}`}
        </button>
      )}

      {/* Tiebreakers — solo en quinielas KO */}
      {teams && teams.length > 0 && (
        <TiebreakerSection
          teams={teams}
          tb={tb}
          savedTb={savedTb}
          setTb={setTb}
          interactable={access.entered && !locked}
          loading={tbLoading}
          error={tbError}
          onSave={async () => {
            setTbLoading(true); setTbError("");
            const res = await saveKoTiebreaker(module, tb);
            setTbLoading(false);
            if (res?.error) { setTbError(res.error); return; }
            setSavedTb({ ...tb });
          }}
        />
      )}
    </section>
  );
}

function TiebreakerSection({
  teams, tb, savedTb, setTb, interactable, loading, error, onSave,
}: {
  teams: TeamOption[];
  tb: TiebreakerPrediction;
  savedTb: TiebreakerPrediction;
  setTb: (v: TiebreakerPrediction) => void;
  interactable: boolean;
  loading: boolean;
  error: string;
  onSave: () => void;
}) {
  const changed =
    tb.topScorerTeam !== savedTb.topScorerTeam ||
    tb.firstHalfGoals !== savedTb.firstHalfGoals ||
    tb.earliestGoalTeam !== savedTb.earliestGoalTeam;

  const complete = tb.topScorerTeam !== null && tb.firstHalfGoals !== null && tb.earliestGoalTeam !== null;
  const confirmed = complete && !changed;

  const sel = "block w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.03] p-3.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-3">
        <ShieldAlert size={13} /> Desempate
      </h3>
      <div className="space-y-2.5">
        {/* TB1 */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">¿Qué equipo anotará más goles en esta ronda?</label>
          <select
            disabled={!interactable}
            value={tb.topScorerTeam ?? ""}
            onChange={(e) => setTb({ ...tb, topScorerTeam: e.target.value || null })}
            className={sel}
          >
            <option value="">— Elige un equipo —</option>
            {teams.map((t) => <option key={t.code} value={t.code}>{t.flag ? `${t.flag} ` : ""}{t.name}</option>)}
          </select>
        </div>
        {/* TB2 */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">¿Cuántos goles habrá en 1er tiempo (todos los partidos)?</label>
          <input
            type="number" min={0} max={99}
            disabled={!interactable}
            value={tb.firstHalfGoals ?? ""}
            onChange={(e) => setTb({ ...tb, firstHalfGoals: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Ej. 12"
            className={`${sel} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>
        {/* TB3 */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">¿Qué equipo anotará el gol más tempranero de la ronda?</label>
          <select
            disabled={!interactable}
            value={tb.earliestGoalTeam ?? ""}
            onChange={(e) => setTb({ ...tb, earliestGoalTeam: e.target.value || null })}
            className={sel}
          >
            <option value="">— Elige un equipo —</option>
            {teams.map((t) => <option key={t.code} value={t.code}>{t.flag ? `${t.flag} ` : ""}{t.name}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      {interactable && (
        <button
          onClick={onSave}
          disabled={loading || !complete || confirmed}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
            confirmed
              ? "bg-amber-400/10 text-amber-300 border border-amber-400/25"
              : complete
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(251,191,36,0.7)]"
                : "bg-white/[0.04] text-slate-500 border border-white/10"
          }`}
        >
          {loading ? "Guardando..." : confirmed ? "✓ Desempate guardado" : complete ? "Guardar desempate" : "Completa las 3 predicciones"}
        </button>
      )}
    </div>
  );
}
