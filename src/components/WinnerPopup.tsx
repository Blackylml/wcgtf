"use client";

import { useEffect, useState, useTransition } from "react";
import { Trophy, X } from "lucide-react";
import { reactToJornada, type ReactionState } from "@/app/jornada-actions";

const CONFETTI = ["#22e07a", "#3b82f6", "#fbbf24", "#a855f7", "#f43f5e", "#ffffff"];

function firstNames(names: string[]) {
  const fn = names.map((n) => n.split(" ")[0]);
  if (fn.length <= 1) return fn[0] ?? "";
  if (fn.length === 2) return `${fn[0]} y ${fn[1]}`;
  return `${fn.slice(0, -1).join(", ")} y ${fn[fn.length - 1]}`;
}

/**
 * Anuncio del ganador de la jornada pasada — se muestra a TODOS una vez por
 * jornada (recordado en localStorage), con reacciones (boo / vamos) en vivo.
 */
export function WinnerPopup({
  jornadaKey,
  label,
  winnerNames,
  amIWinner,
  initial,
}: {
  jornadaKey: string;
  label: string;
  winnerNames: string[];
  amIWinner: boolean;
  initial: ReactionState;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReactionState>(initial);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      if (!localStorage.getItem(`wcgtf-winner-seen-${jornadaKey}`)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [jornadaKey]);

  function close() {
    try {
      localStorage.setItem(`wcgtf-winner-seen-${jornadaKey}`, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function react(type: "boo" | "cheer") {
    // Optimista: refleja el cambio al instante.
    setState((s) => {
      const counts = { ...s.counts };
      if (s.myReaction === "boo") counts.boo = Math.max(0, counts.boo - 1);
      if (s.myReaction === "cheer") counts.cheer = Math.max(0, counts.cheer - 1);
      counts[type] += 1;
      return { counts, myReaction: type };
    });
    start(async () => {
      const res = await reactToJornada(jornadaKey, type);
      if (!("error" in res)) setState(res);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-5 bg-black/70 backdrop-blur-sm animate-fade" onClick={close}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 36 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-[-10%] w-2 h-3 rounded-[2px] animate-confetti"
            style={{
              left: `${(i * 2.7) % 100}%`,
              backgroundColor: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 12) * 0.18}s`,
              animationDuration: `${2.6 + (i % 5) * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-sm rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#10243a] to-[#0a1422] p-7 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08]"
        >
          <X size={16} />
        </button>

        <span className="inline-grid place-items-center w-20 h-20 rounded-3xl bg-amber-400/12 ring-1 ring-amber-400/40 halo-amber mb-4 animate-trophy">
          <Trophy size={40} className="text-amber-400" strokeWidth={1.6} />
        </span>

        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-[0.24em] mb-1">
          {amIWinner ? "¡Felicidades!" : `Ganador · ${label}`}
        </p>

        {amIWinner ? (
          <h2 className="font-display text-3xl font-extrabold text-white leading-tight">
            Ganaste la <span className="text-gradient-brand">{label}</span>
          </h2>
        ) : (
          <h2 className="font-display text-2xl font-extrabold text-white leading-tight">
            <span className="text-gradient-brand">{firstNames(winnerNames)}</span>
            <br />
            {winnerNames.length > 1 ? "ganaron" : "ganó"} la {label}
          </h2>
        )}

        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          {amIWinner ? "Quedaste en lo más alto del ranking. 🏆 ¡A defenderlo!" : "¿Qué opinas? Déjale tu reacción 👇"}
        </p>

        {/* Reacciones */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => react("cheer")}
            disabled={pending}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition active:scale-[0.97] disabled:opacity-60 ${
              state.myReaction === "cheer"
                ? "bg-green-500/20 ring-2 ring-green-400/60 text-green-300"
                : "bg-white/[0.04] ring-1 ring-white/10 text-slate-200 hover:bg-white/[0.08]"
            }`}
          >
            <span className="text-lg">🔥</span> ¡Vamooos!
            <span className="tabular-nums text-sm opacity-80">{state.counts.cheer}</span>
          </button>
          <button
            onClick={() => react("boo")}
            disabled={pending}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition active:scale-[0.97] disabled:opacity-60 ${
              state.myReaction === "boo"
                ? "bg-rose-500/20 ring-2 ring-rose-400/60 text-rose-300"
                : "bg-white/[0.04] ring-1 ring-white/10 text-slate-200 hover:bg-white/[0.08]"
            }`}
          >
            <span className="text-lg">👎</span> Booo
            <span className="tabular-nums text-sm opacity-80">{state.counts.boo}</span>
          </button>
        </div>

        <button onClick={close} className="mt-4 w-full py-2.5 rounded-2xl font-display font-semibold text-slate-300 bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08] transition">
          Cerrar
        </button>
      </div>
    </div>
  );
}
