"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MatchPick, Module } from "@/generated/prisma/client";
import { saveQuinielaBets } from "./actions";
import { FlagCircle } from "@/components/FlagCircle";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import type { ModuleAccent } from "@/lib/modules";
import { Check, Lock, Clock } from "lucide-react";

export type QMatch = {
  id: string;
  matchNumber: number;
  homeName: string; homeFlag: string | null; homeCode: string | null;
  awayName: string; awayFlag: string | null; awayCode: string | null;
  isOpen: boolean;
  userBet: MatchPick | null;
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

const SEG: { pick: MatchPick; label: string }[] = [
  { pick: "HOME", label: "L" },
  { pick: "DRAW", label: "E" },
  { pick: "AWAY", label: "V" },
];

export function QuinielaSection({
  module, label, accent, matches, access, locked, lockLabel,
}: {
  module: Module;
  label: string;
  accent: ModuleAccent;
  matches: QMatch[];
  access: Access;
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

  const openMatches = matches.filter((m) => m.isOpen);
  const done = matches.filter((m) => picks[m.id]).length;
  const allPicked = openMatches.length > 0 && openMatches.every((m) => picks[m.id]);
  const changed = openMatches.some((m) => picks[m.id] && picks[m.id] !== saved[m.id]);
  const missing = openMatches.filter((m) => !picks[m.id]).length;

  const interactable = access.entered && !locked;

  function choose(id: string, pick: MatchPick) {
    if (!interactable) return;
    setError("");
    setPicks((p) => ({ ...p, [id]: pick }));
  }

  async function confirm() {
    setLoading(true); setError("");
    const payload = openMatches.filter((m) => picks[m.id]).map((m) => ({ matchId: m.id, pick: picks[m.id] }));
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
        {fullyConfirmed && access.entered && (
          <span className="flex items-center gap-1 text-green-300 text-[11px] font-semibold bg-green-400/10 border border-green-400/20 rounded-full px-2 py-1 shrink-0">
            <Check size={11} /> Lista
          </span>
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
      />

      {/* Match rows */}
      <div className={`rounded-xl border border-white/[0.06] overflow-hidden ${!interactable ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {matches.map((m) => {
          const sel = picks[m.id];
          const closed = !m.isOpen;
          return (
            <div key={m.id} className="flex items-center gap-2 px-2.5 py-2 border-b border-white/[0.05] last:border-0">
              <span className="font-mono text-[10px] text-slate-600 w-5 shrink-0">{m.matchNumber}</span>

              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-[11px] text-slate-200 truncate text-right">{m.homeName}</span>
                <FlagCircle flag={m.homeFlag} code={m.homeCode} size={18} />
              </div>

              <div className="flex gap-1 shrink-0">
                {SEG.map(({ pick, label: l }) => {
                  const active = sel === pick;
                  return (
                    <button
                      key={pick}
                      type="button"
                      disabled={closed}
                      onClick={() => choose(m.id, pick)}
                      className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all ${
                        active
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_-4px_rgba(59,157,255,0.9)]"
                          : closed
                            ? "bg-white/[0.02] text-slate-700"
                            : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-90"
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <FlagCircle flag={m.awayFlag} code={m.awayCode} size={18} />
                <span className="text-[11px] text-slate-200 truncate">{m.awayName}</span>
              </div>

              {closed && <Lock size={11} className="text-slate-600 shrink-0" />}
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
    </section>
  );
}
