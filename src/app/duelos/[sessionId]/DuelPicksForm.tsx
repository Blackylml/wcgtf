"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MatchPick } from "@/generated/prisma/client";
import { saveDuelBets } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { Lock, Clock } from "lucide-react";

type DuelMatch = {
  id: string;
  matchNumber: number;
  homeName: string;
  homeFlag: string | null;
  homeCode: string | null;
  awayName: string;
  awayFlag: string | null;
  awayCode: string | null;
  userBet: MatchPick | null;
};

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
        <g transform="translate(15 15)">
          <path d="M2 8 l4 4 l8 -9" fill="none" stroke="#22e07a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <text x="23" y="23" textAnchor="middle" dominantBaseline="central" className="fill-white font-bold" style={{ fontSize: 12 }}>
          {done}
        </text>
      )}
    </svg>
  );
}

export function DuelPicksForm({
  sessionId,
  matches,
  locked,
  lockLabel,
}: {
  sessionId: string;
  matches: DuelMatch[];
  locked: boolean;
  lockLabel: string;
}) {
  const router = useRouter();

  const init = () => {
    const m: Record<string, MatchPick> = {};
    for (const x of matches) if (x.userBet) m[x.id] = x.userBet;
    return m;
  };
  const [picks, setPicks] = useState<Record<string, MatchPick>>(init);
  const [saved, setSaved] = useState<Record<string, MatchPick>>(init);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const done = matches.filter((m) => picks[m.id]).length;
  const allPicked = matches.length > 0 && matches.every((m) => picks[m.id]);
  const changed = matches.some((m) => picks[m.id] && picks[m.id] !== saved[m.id]);
  const missing = matches.filter((m) => !picks[m.id]).length;
  const fullyConfirmed = allPicked && !changed;
  const interactable = !locked;

  function choose(id: string, pick: MatchPick) {
    if (!interactable) return;
    setError("");
    setPicks((p) => ({ ...p, [id]: pick }));
  }

  async function confirm() {
    setLoading(true);
    setError("");
    const payload = matches.filter((m) => picks[m.id]).map((m) => ({ matchId: m.id, pick: picks[m.id] }));
    const res = await saveDuelBets(sessionId, payload);
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setSaved({ ...picks });
    router.refresh();
  }

  return (
    <section className="animate-rise mb-7 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <ProgressRing done={done} total={matches.length} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-white leading-tight">Mis picks del duelo</h2>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
            <span>{done}/{matches.length}</span>
            <span className="text-slate-700">·</span>
            {locked ? (
              <span className="inline-flex items-center gap-1 text-red-300/90 font-medium">
                <Lock size={10} /> Cerrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Clock size={10} /> cierra {lockLabel}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Match rows */}
      <div className={`rounded-xl border border-white/[0.06] overflow-hidden ${!interactable ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {matches.map((m) => {
          const sel = picks[m.id];
          return (
            <div key={m.id} className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.05] last:border-0">
              <span className="font-mono text-[10px] text-slate-600 w-4 shrink-0">{m.matchNumber}</span>

              {/* HOME */}
              <button
                type="button"
                onClick={() => choose(m.id, "HOME")}
                className={`flex items-center justify-end gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                  sel === "HOME" ? "bg-blue-500/15 border-blue-400/50" : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <span className={`text-[11px] truncate text-right ${sel === "HOME" ? "text-white font-semibold" : "text-slate-300"}`}>
                  {m.homeName}
                </span>
                <FlagCircle flag={m.homeFlag} code={m.homeCode} size={22} ring={sel === "HOME" ? "ring-blue-400/70" : "ring-white/12"} />
              </button>

              {/* DRAW */}
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

              {/* AWAY */}
              <button
                type="button"
                onClick={() => choose(m.id, "AWAY")}
                className={`flex items-center justify-start gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg border transition-all active:scale-[0.98] ${
                  sel === "AWAY" ? "bg-blue-500/15 border-blue-400/50" : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <FlagCircle flag={m.awayFlag} code={m.awayCode} size={22} ring={sel === "AWAY" ? "ring-blue-400/70" : "ring-white/12"} />
                <span className={`text-[11px] truncate ${sel === "AWAY" ? "text-white font-semibold" : "text-slate-300"}`}>
                  {m.awayName}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

      {/* Save button */}
      {!locked && (
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
          {loading ? "Guardando..." : fullyConfirmed ? "✓ Picks guardados" : allPicked ? "Guardar picks" : `Faltan ${missing}`}
        </button>
      )}
    </section>
  );
}
