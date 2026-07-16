"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MatchPick } from "@/generated/prisma/client";
import { saveDuelTiebreakerPick } from "./actions";
import { ShieldAlert } from "lucide-react";

type MatchConfig = {
  homeLabel: string | null;
  awayLabel: string | null;
  dateLabel: string | null;
};

type PickState = {
  htPick: MatchPick | null;
  ftPick: MatchPick | null;
};

function PickRow({
  label,
  homeLabel,
  awayLabel,
  value,
  onChange,
  disabled,
}: {
  label: string;
  homeLabel: string;
  awayLabel: string;
  value: MatchPick | null;
  onChange: (p: MatchPick) => void;
  disabled: boolean;
}) {
  const tag = label === "1T"
    ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
    : "bg-blue-500/20 text-blue-300 border border-blue-500/35";

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5">
      <span className={`text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-full w-[26px] text-center leading-tight ${tag}`}>
        {label}
      </span>

      {/* HOME */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("HOME")}
        className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-[11px] transition-all active:scale-[0.98] text-right truncate ${
          value === "HOME"
            ? "bg-amber-500/15 border-amber-400/50 text-white font-semibold"
            : "border-transparent hover:bg-white/[0.04] text-slate-300"
        }`}
      >
        {homeLabel}
      </button>

      {/* DRAW */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("DRAW")}
        className={`w-9 h-9 shrink-0 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${
          value === "DRAW"
            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_4px_12px_-4px_rgba(251,191,36,0.7)]"
            : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
        }`}
      >
        X
      </button>

      {/* AWAY */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("AWAY")}
        className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-[11px] transition-all active:scale-[0.98] truncate ${
          value === "AWAY"
            ? "bg-amber-500/15 border-amber-400/50 text-white font-semibold"
            : "border-transparent hover:bg-white/[0.04] text-slate-300"
        }`}
      >
        {awayLabel}
      </button>
    </div>
  );
}

export function TiebreakerForm({
  sessionId,
  match1,
  match2,
  savedPick0,
  savedPick1,
  locked,
}: {
  sessionId: string;
  match1: MatchConfig;
  match2: MatchConfig | null;
  savedPick0: { htPick: MatchPick; ftPick: MatchPick } | null;
  savedPick1: { htPick: MatchPick; ftPick: MatchPick } | null;
  locked: boolean;
}) {
  const router = useRouter();

  const [pick0, setPick0] = useState<PickState>({
    htPick: savedPick0?.htPick ?? null,
    ftPick: savedPick0?.ftPick ?? null,
  });
  const [pick1, setPick1] = useState<PickState>({
    htPick: savedPick1?.htPick ?? null,
    ftPick: savedPick1?.ftPick ?? null,
  });
  const [savedState0] = useState<PickState>({
    htPick: savedPick0?.htPick ?? null,
    ftPick: savedPick0?.ftPick ?? null,
  });
  const [savedState1] = useState<PickState>({
    htPick: savedPick1?.htPick ?? null,
    ftPick: savedPick1?.ftPick ?? null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const home1 = match1.homeLabel ?? "Local";
  const away1 = match1.awayLabel ?? "Visitante";
  const home2 = match2?.homeLabel ?? "Local";
  const away2 = match2?.awayLabel ?? "Visitante";

  const m0Complete = pick0.htPick !== null && pick0.ftPick !== null;
  const m1Complete = !match2 || (pick1.htPick !== null && pick1.ftPick !== null);
  const allComplete = m0Complete && m1Complete;

  const changed =
    pick0.htPick !== savedState0.htPick ||
    pick0.ftPick !== savedState0.ftPick ||
    (match2 && (pick1.htPick !== savedState1.htPick || pick1.ftPick !== savedState1.ftPick));
  const confirmed = allComplete && !changed;

  async function save() {
    if (!pick0.htPick || !pick0.ftPick) return;
    setLoading(true);
    setError("");
    const results = await Promise.all([
      saveDuelTiebreakerPick(sessionId, 0, pick0.htPick, pick0.ftPick),
      ...(match2 && pick1.htPick && pick1.ftPick
        ? [saveDuelTiebreakerPick(sessionId, 1, pick1.htPick, pick1.ftPick)]
        : []),
    ]);
    setLoading(false);
    const firstError = results.find((r) => r.error);
    if (firstError?.error) { setError(firstError.error); return; }
    router.refresh();
  }

  return (
    <section className="animate-rise mb-7 rounded-2xl border border-amber-400/15 bg-amber-400/[0.03] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-3">
        <ShieldAlert size={13} /> Desempate
      </h3>

      {/* Match 1 */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-3">
        {match1.dateLabel && (
          <p className="text-[10px] text-slate-500 px-3 pt-2">{match1.dateLabel}</p>
        )}
        <p className="text-[11px] font-semibold text-slate-300 px-3 pt-1.5 pb-0.5">
          {home1} vs {away1}
        </p>
        <PickRow
          label="1T"
          homeLabel={home1}
          awayLabel={away1}
          value={pick0.htPick}
          onChange={(p) => setPick0((s) => ({ ...s, htPick: p }))}
          disabled={locked}
        />
        <PickRow
          label="FT"
          homeLabel={home1}
          awayLabel={away1}
          value={pick0.ftPick}
          onChange={(p) => setPick0((s) => ({ ...s, ftPick: p }))}
          disabled={locked}
        />
      </div>

      {/* Match 2 (optional) */}
      {match2 && (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-3">
          {match2.dateLabel && (
            <p className="text-[10px] text-slate-500 px-3 pt-2">{match2.dateLabel}</p>
          )}
          <p className="text-[11px] font-semibold text-slate-300 px-3 pt-1.5 pb-0.5">
            {home2} vs {away2}
          </p>
          <PickRow
            label="1T"
            homeLabel={home2}
            awayLabel={away2}
            value={pick1.htPick}
            onChange={(p) => setPick1((s) => ({ ...s, htPick: p }))}
            disabled={locked}
          />
          <PickRow
            label="FT"
            homeLabel={home2}
            awayLabel={away2}
            value={pick1.ftPick}
            onChange={(p) => setPick1((s) => ({ ...s, ftPick: p }))}
            disabled={locked}
          />
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

      {!locked && (
        <button
          onClick={save}
          disabled={loading || !allComplete || confirmed}
          className={`mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
            confirmed
              ? "bg-amber-400/10 text-amber-300 border border-amber-400/25"
              : allComplete
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(251,191,36,0.7)]"
                : "bg-white/[0.04] text-slate-500 border border-white/10"
          }`}
        >
          {loading
            ? "Guardando..."
            : confirmed
              ? "✓ Desempate guardado"
              : allComplete
                ? "Guardar desempate"
                : "Completa el desempate"}
        </button>
      )}
    </section>
  );
}
