"use client";

import { useActionState, useState } from "react";
import { submitBracketBet } from "./actions";
import { ChevronDown } from "lucide-react";

type BracketConfig = { R32: [string, string][] };
type TeamInfo = { code: string; name: string; flag: string | null };

interface Props { config: BracketConfig; teams: TeamInfo[]; price: number; }

type ActionState = { error?: string } | null;

async function bracketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await submitBracketBet(formData);
  return result ?? null;
}

type StagePicks = Record<string, string>;

export function BracketForm({ config, teams, price }: Props) {
  const [state, formAction] = useActionState(bracketAction, null);
  const teamMap = new Map(teams.map((t) => [t.code, t]));

  const [r32, setR32] = useState<StagePicks>({});
  const [r16, setR16] = useState<StagePicks>({});
  const [qf, setQf] = useState<StagePicks>({});
  const [sf, setSf] = useState<StagePicks>({});
  const [third, setThird] = useState("");
  const [champion, setChampion] = useState("");

  function PickRow({
    label, t1, t2, name, value, onChange,
  }: { label: string; t1: string; t2: string; name: string; value: string; onChange: (v: string) => void }) {
    const team1 = teamMap.get(t1);
    const team2 = teamMap.get(t2);
    const labelT1 = team1 ? `${team1.flag ?? ""} ${team1.name}` : (t1 || "?");
    const labelT2 = team2 ? `${team2.flag ?? ""} ${team2.name}` : (t2 || "?");
    return (
      <div className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
        <span className="text-[11px] text-slate-600 w-7 shrink-0">{label}</span>
        <span className="flex-1 text-xs text-slate-300 truncate text-right">{labelT1}</span>
        <span className="text-[10px] text-slate-600 shrink-0">vs</span>
        <span className="flex-1 text-xs text-slate-300 truncate">{labelT2}</span>
        <div className="relative shrink-0">
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            className="appearance-none bg-black/30 border border-white/10 rounded-lg pl-2 pr-6 py-1.5 text-xs text-slate-200 focus:border-amber-400/50 focus:outline-none w-28"
          >
            <option value="">Avanza…</option>
            {t1 && <option value={t1}>{labelT1}</option>}
            {t2 && <option value={t2}>{labelT2}</option>}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>
    );
  }

  function FinalSelect({ label, name, value, options, onChange }: {
    label: string; name: string; value: string; options: string[]; onChange: (v: string) => void;
  }) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
        <div className="relative flex-1">
          <select name={name} value={value} onChange={(e) => onChange(e.target.value)} required
            className="w-full appearance-none bg-black/30 border border-white/10 rounded-lg px-3 pr-7 py-2 text-sm text-slate-200 focus:border-amber-400/50 focus:outline-none">
            <option value="">Elegir…</option>
            {options.filter(Boolean).map((code) => {
              const t = teamMap.get(code);
              return <option key={code} value={code}>{t?.flag} {t?.name ?? code}</option>;
            })}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>
    );
  }

  const r16Matchups: [string, string][] = Array.from({ length: 8 }, (_, i) => [r32[String(i * 2)] ?? "", r32[String(i * 2 + 1)] ?? ""]);
  const qfMatchups: [string, string][] = Array.from({ length: 4 }, (_, i) => [r16[String(i * 2)] ?? "", r16[String(i * 2 + 1)] ?? ""]);
  const sfMatchups: [string, string][] = Array.from({ length: 2 }, (_, i) => [qf[String(i * 2)] ?? "", qf[String(i * 2 + 1)] ?? ""]);

  const Stage = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 mb-3">
      <p className="text-[11px] text-amber-300/80 uppercase tracking-[0.16em] font-semibold mb-2">{title}</p>
      {children}
    </div>
  );

  return (
    <form action={formAction} className="space-y-0">
      {state?.error && (
        <div className="mb-3 rounded-lg bg-red-900/20 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <Stage title="Ronda de 32 — 16 partidos">
        {config.R32.map(([t1, t2], i) => (
          <PickRow key={i} label={`R${i + 1}`} t1={t1} t2={t2}
            name={`R32_${i}`} value={r32[String(i)] ?? ""}
            onChange={(v) => { setR32((p) => ({ ...p, [String(i)]: v })); setR16((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }} />
        ))}
      </Stage>

      <Stage title="Ronda de 16 — 8 partidos">
        {r16Matchups.map(([t1, t2], i) => (
          <PickRow key={i} label={`O${i + 1}`} t1={t1} t2={t2}
            name={`R16_${i}`} value={r16[String(i)] ?? ""}
            onChange={(v) => { setR16((p) => ({ ...p, [String(i)]: v })); setQf((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }} />
        ))}
      </Stage>

      <Stage title="Cuartos de Final">
        {qfMatchups.map(([t1, t2], i) => (
          <PickRow key={i} label={`C${i + 1}`} t1={t1} t2={t2}
            name={`QF_${i}`} value={qf[String(i)] ?? ""}
            onChange={(v) => { setQf((p) => ({ ...p, [String(i)]: v })); setSf((p) => ({ ...p, [String(Math.floor(i / 2))]: "" })); }} />
        ))}
      </Stage>

      <Stage title="Semifinales">
        {sfMatchups.map(([t1, t2], i) => (
          <PickRow key={i} label={`S${i + 1}`} t1={t1} t2={t2}
            name={`SF_${i}`} value={sf[String(i)] ?? ""}
            onChange={(v) => { setSf((p) => ({ ...p, [String(i)]: v })); setChampion(""); setThird(""); }} />
        ))}
      </Stage>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 mb-4">
        <p className="text-[11px] text-amber-300/80 uppercase tracking-[0.16em] font-semibold mb-2">Final</p>
        <FinalSelect label="Tercer lugar" name="THIRD" value={third}
          options={Object.values(sf)} onChange={setThird} />
        <FinalSelect label="Campeon" name="FINAL" value={champion}
          options={Object.values(sf)} onChange={setChampion} />
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl py-3.5 text-sm transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(245,177,60,0.8)]"
      >
        {price > 0 ? `Enviar bracket · Pagar $${price} MXN` : "Enviar bracket"}
      </button>
    </form>
  );
}
