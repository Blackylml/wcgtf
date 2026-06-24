"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trophy, X } from "lucide-react";
import { reactToJornada, type ReactionState } from "@/app/jornada-actions";

const CONFETTI = ["#22e07a", "#3b82f6", "#fbbf24", "#a855f7", "#f43f5e", "#ffffff"];
const BURST_COUNT = 16;

type Winner = { id: string; name: string; image: string | null };

/** Nombre + apellido (primeras dos palabras). */
function displayName(name: string) {
  return name.split(" ").slice(0, 2).join(" ");
}

function Avatar({ w, size = 44 }: { w: Winner; size?: number }) {
  const initials = w.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  if (w.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto de perfil de Google
      <img
        src={w.image}
        alt={w.name}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-amber-400/50 shrink-0"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-white/[0.08] ring-2 ring-amber-400/50 text-sm font-bold text-slate-200 shrink-0"
    >
      {initials || "?"}
    </span>
  );
}

export function WinnerPopup({
  jornadaKey,
  label,
  winners,
  amIWinner,
  initial,
}: {
  jornadaKey: string;
  label: string;
  winners: Winner[];
  amIWinner: boolean;
  initial: ReactionState;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReactionState>(initial);
  const [burst, setBurst] = useState<{ id: number; emoji: string } | null>(null);
  const burstId = useRef(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      if (!localStorage.getItem(`wcgtf-winner-seen-${jornadaKey}`)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [jornadaKey]);

  // Limpia el estallido cuando termina la animación.
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 1300);
    return () => clearTimeout(t);
  }, [burst]);

  function close() {
    try {
      localStorage.setItem(`wcgtf-winner-seen-${jornadaKey}`, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function react(type: "boo" | "cheer") {
    burstId.current += 1;
    setBurst({ id: burstId.current, emoji: type === "boo" ? "👎" : "🔥" });

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
      {/* Confeti de fondo */}
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

      {/* Estallido de emojis al reaccionar */}
      {burst && (
        <div key={burst.id} className="pointer-events-none fixed inset-0 z-[110] grid place-items-center overflow-hidden">
          {Array.from({ length: BURST_COUNT }).map((_, i) => {
            const tx = ((i / (BURST_COUNT - 1)) * 2 - 1) * 44; // -44vw .. 44vw
            const peak = -(28 + (i % 5) * 9); // sube
            const rot = (i % 2 ? 1 : -1) * (120 + i * 28);
            return (
              <span
                key={i}
                className="absolute text-3xl animate-emoji-burst"
                style={
                  {
                    "--tx": `${tx}vw`,
                    "--peak": `${peak}vh`,
                    "--rot": `${rot}deg`,
                    animationDelay: `${(i % 6) * 30}ms`,
                  } as React.CSSProperties
                }
              >
                {burst.emoji}
              </span>
            );
          })}
        </div>
      )}

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

        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-[0.24em] mb-3">
          {amIWinner ? "¡Felicidades!" : `Ganador · ${label}`}
        </p>

        {/* Ganador(es): foto + apellido */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 mb-3">
          {winners.map((w) => (
            <div key={w.id} className="flex flex-col items-center gap-1.5 w-[88px]">
              <Avatar w={w} />
              <span className="text-xs font-semibold text-white leading-tight text-center truncate w-full">{displayName(w.name)}</span>
            </div>
          ))}
        </div>

        <h2 className="font-display text-xl font-extrabold text-white leading-tight">
          {amIWinner ? (
            <>Ganaste la <span className="text-gradient-brand">{label}</span></>
          ) : (
            <>{winners.length > 1 ? "Ganaron" : "Ganó"} la <span className="text-gradient-brand">{label}</span></>
          )}
        </h2>

        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          {amIWinner ? "Quedaste en lo más alto del ranking. 🏆" : "¿Qué opinas? Déjale tu reacción 👇"}
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
