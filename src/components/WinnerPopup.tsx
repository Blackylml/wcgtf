"use client";

import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";

const CONFETTI = ["#22e07a", "#3b82f6", "#fbbf24", "#a855f7", "#f43f5e", "#ffffff"];

/**
 * Pop-up de felicitación para el/los ganador(es) de la jornada pasada.
 * Se muestra una sola vez por jornada (recordado en localStorage).
 */
export function WinnerPopup({ jornadaKey, label }: { jornadaKey: string; label: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storeKey = `wcgtf-winner-seen-${jornadaKey}`;
    try {
      if (!localStorage.getItem(storeKey)) setOpen(true);
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-5 bg-black/70 backdrop-blur-sm animate-fade"
      onClick={close}
    >
      {/* Confeti */}
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

        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-[0.24em] mb-1">¡Felicidades!</p>
        <h2 className="font-display text-3xl font-extrabold text-white leading-tight">
          Ganaste la <span className="text-gradient-brand">{label}</span>
        </h2>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Quedaste en lo más alto del ranking. 🏆<br />¡A defender el título la próxima!
        </p>

        <button
          onClick={close}
          className="mt-6 w-full py-3 rounded-2xl font-display font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-[0.98] transition shadow-[0_10px_30px_-10px_rgba(251,191,36,0.7)]"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
