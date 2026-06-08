"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBracketBet } from "./actions";

type BracketConfig = { R32: [string, string][] };
type TeamInfo = { code: string; name: string; flag: string | null };
type TeamMap = Map<string, TeamInfo>;
type Picks = Record<string, string>;

function TeamBtn({
  team, code, picked, onClick,
}: { team?: TeamInfo; code: string; picked: boolean; onClick: () => void }) {
  const disabled = !code;
  const label = team?.name ?? (code || "Por definir");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left transition-all min-w-0 ${
        picked
          ? "bg-amber-400/15 border-amber-400/50"
          : disabled
            ? "bg-black/20 border-white/5 opacity-50 cursor-not-allowed"
            : "bg-black/20 border-white/10 hover:border-amber-400/40 active:scale-[0.98]"
      }`}
    >
      <span className="text-base leading-none shrink-0">{team?.flag ?? "🏳️"}</span>
      <span className={`text-xs truncate ${picked ? "text-amber-200 font-semibold" : "text-slate-300"}`}>{label}</span>
    </button>
  );
}

function MatchupRow({
  label, t1, t2, teamMap, value, onPick,
}: { label: string; t1: string; t2: string; teamMap: TeamMap; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] font-mono text-slate-600 w-6 shrink-0">{label}</span>
      <div className="flex-1 grid grid-cols-2 gap-1.5 min-w-0">
        <TeamBtn team={teamMap.get(t1)} code={t1} picked={!!t1 && value === t1} onClick={() => onPick(t1)} />
        <TeamBtn team={teamMap.get(t2)} code={t2} picked={!!t2 && value === t2} onClick={() => onPick(t2)} />
      </div>
    </div>
  );
}

function Stage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 mb-3">
      <p className="text-[11px] text-amber-300/80 uppercase tracking-[0.16em] font-semibold mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function FinalPick({
  label, options, teamMap, value, onPick,
}: { label: string; options: string[]; teamMap: TeamMap; value: string; onPick: (v: string) => void }) {
  const opts = options.filter(Boolean);
  return (
    <div className="py-1.5">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {opts.length === 0 ? (
        <p className="text-[11px] text-slate-600">Define las semifinales primero</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {opts.map((code) => (
            <TeamBtn key={code} team={teamMap.get(code)} code={code} picked={value === code} onClick={() => onPick(code)} />
          ))}
        </div>
      )}
    </div>
  );
}

const count = (o: Picks) => Object.values(o).filter(Boolean).length;

export function BracketForm({ config, teams }: { config: BracketConfig; teams: TeamInfo[] }) {
  const router = useRouter();
  const teamMap: TeamMap = new Map(teams.map((t) => [t.code, t]));

  const [r32, setR32] = useState<Picks>({});
  const [r16, setR16] = useState<Picks>({});
  const [qf, setQf] = useState<Picks>({});
  const [sf, setSf] = useState<Picks>({});
  const [third, setThird] = useState("");
  const [champion, setChampion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nR32 = config.R32.length;
  const nR16 = Math.floor(nR32 / 2);
  const nQF = Math.floor(nR32 / 4);
  const nSF = Math.floor(nR32 / 8);

  const r16Matchups = Array.from({ length: nR16 }, (_, i) => [r32[String(i * 2)] ?? "", r32[String(i * 2 + 1)] ?? ""]);
  const qfMatchups = Array.from({ length: nQF }, (_, i) => [r16[String(i * 2)] ?? "", r16[String(i * 2 + 1)] ?? ""]);
  const sfMatchups = Array.from({ length: nSF }, (_, i) => [qf[String(i * 2)] ?? "", qf[String(i * 2 + 1)] ?? ""]);

  const total = nR32 + nR16 + nQF + nSF + 2;
  const done = count(r32) + count(r16) + count(qf) + count(sf) + (third ? 1 : 0) + (champion ? 1 : 0);
  const complete = done === total;

  async function handleSubmit() {
    if (!complete) { setError(`Faltan ${total - done} selecciones`); return; }
    setLoading(true); setError("");
    const result = await createBracketBet({ R32: r32, R16: r16, QF: qf, SF: sf, THIRD: third, FINAL: champion });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    router.refresh();
  }

  return (
    <div>
      {/* Progress */}
      <div className="sticky top-16 z-20 mb-3 -mx-4 px-4">
        <div className="rounded-xl border border-white/10 bg-[#0b1322]/90 backdrop-blur px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">{done}/{total} selecciones</span>
          <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <Stage title={`Ronda de 32 — ${nR32} partidos`}>
        {config.R32.map(([t1, t2], i) => (
          <MatchupRow
            key={i} label={`R${i + 1}`} t1={t1} t2={t2} teamMap={teamMap} value={r32[String(i)] ?? ""}
            onPick={(v) => { setR32((p) => ({ ...p, [String(i)]: v })); setR16((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }}
          />
        ))}
      </Stage>

      <Stage title={`Ronda de 16 — ${nR16} partidos`}>
        {r16Matchups.map(([t1, t2], i) => (
          <MatchupRow
            key={i} label={`O${i + 1}`} t1={t1} t2={t2} teamMap={teamMap} value={r16[String(i)] ?? ""}
            onPick={(v) => { setR16((p) => ({ ...p, [String(i)]: v })); setQf((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }}
          />
        ))}
      </Stage>

      <Stage title="Cuartos de Final">
        {qfMatchups.map(([t1, t2], i) => (
          <MatchupRow
            key={i} label={`C${i + 1}`} t1={t1} t2={t2} teamMap={teamMap} value={qf[String(i)] ?? ""}
            onPick={(v) => { setQf((p) => ({ ...p, [String(i)]: v })); setSf((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }}
          />
        ))}
      </Stage>

      <Stage title="Semifinales">
        {sfMatchups.map(([t1, t2], i) => (
          <MatchupRow
            key={i} label={`S${i + 1}`} t1={t1} t2={t2} teamMap={teamMap} value={sf[String(i)] ?? ""}
            onPick={(v) => { setSf((p) => ({ ...p, [String(i)]: v })); setChampion(""); setThird(""); }}
          />
        ))}
      </Stage>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 mb-4">
        <p className="text-[11px] text-amber-300/80 uppercase tracking-[0.16em] font-semibold mb-2">Final</p>
        <FinalPick label="Tercer lugar" options={Object.values(sf)} teamMap={teamMap} value={third} onPick={setThird} />
        <FinalPick label="Campeón" options={Object.values(sf)} teamMap={teamMap} value={champion} onPick={setChampion} />
      </div>

      {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !complete}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl py-3.5 text-sm transition-all active:scale-[0.98] disabled:opacity-40 shadow-[0_10px_28px_-10px_rgba(245,177,60,0.8)]"
      >
        {loading ? "Enviando..." : complete ? "Confirmar bracket" : `Faltan ${total - done} selecciones`}
      </button>
    </div>
  );
}
