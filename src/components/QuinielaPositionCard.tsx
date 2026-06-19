"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trophy, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export type QuinielaSlot = {
  label: string;
  rank: number;
  total: number;
  points: number;
  ranked: boolean;
};

export function QuinielaPositionCard({ slots }: { slots: QuinielaSlot[] }) {
  const [idx, setIdx] = useState(0);

  if (slots.length === 0) return null;

  const s = slots[idx];
  const multi = slots.length > 1;

  return (
    <section
      className="animate-rise flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"
      style={{ animationDelay: "80ms" }}
    >
      <div className="flex items-center gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-full bg-blue-400/10 ring-1 ring-blue-400/30">
          <Trophy size={22} className="text-blue-400" strokeWidth={2} />
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em]">{s.label}</p>
            {multi && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => setIdx((i) => (i - 1 + slots.length) % slots.length)}
                  className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Quiniela anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] text-slate-600 tabular-nums">{idx + 1}/{slots.length}</span>
                <button
                  onClick={() => setIdx((i) => (i + 1) % slots.length)}
                  className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Siguiente quiniela"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          {s.ranked ? (
            <>
              <p className="font-display text-4xl font-extrabold text-white leading-none mt-1 tabular-nums">
                {s.rank}°{" "}
                <span className="text-lg font-semibold text-slate-400">de {s.total}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {s.points} acierto{s.points !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="font-display text-4xl font-extrabold text-white leading-none mt-1 tabular-nums">
              {s.total}{" "}
              <span className="text-lg font-semibold text-slate-400">jugando</span>
            </p>
          )}
        </div>
      </div>

      <Link
        href="/partidos"
        className="flex items-center gap-2 text-sm font-semibold text-slate-200 border border-white/12 bg-white/[0.03] rounded-full pl-4 pr-3 py-2.5 hover:bg-white/[0.07] hover:border-white/20 transition-colors"
      >
        <BarChart3 size={15} className="text-blue-400" />
        Ver tabla
        <ArrowRight size={14} className="text-slate-400" />
      </Link>
    </section>
  );
}
