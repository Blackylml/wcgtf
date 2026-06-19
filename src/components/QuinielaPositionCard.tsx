"use client";

import { useRef, useState, useEffect } from "react";
import { Trophy, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export type QuinielaSlot = {
  label: string;
  rank: number;
  total: number;
  points: number;
  ranked: boolean;
};

export function QuinielaPositionCard({ slots }: { slots: QuinielaSlot[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScrollEnd = () => {
      setActiveIdx(Math.round(el.scrollLeft / el.clientWidth));
    };
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, []);

  if (slots.length === 0) return null;

  const multi = slots.length > 1;

  return (
    <section
      className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden"
      style={{ animationDelay: "80ms" }}
    >
      {/* Carrusel deslizable */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {slots.map((s, i) => (
          <div
            key={i}
            className="flex-none w-full snap-start flex items-center justify-between p-4 sm:p-5"
          >
            <div className="flex items-center gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-full bg-blue-400/10 ring-1 ring-blue-400/30 shrink-0">
                <Trophy size={22} className="text-blue-400" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em]">
                  {s.label}
                </p>
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
              className="flex items-center gap-2 text-sm font-semibold text-slate-200 border border-white/12 bg-white/[0.03] rounded-full pl-4 pr-3 py-2.5 hover:bg-white/[0.07] hover:border-white/20 transition-colors shrink-0"
            >
              <BarChart3 size={15} className="text-blue-400" />
              Ver tabla
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
          </div>
        ))}
      </div>

      {/* Dots — solo visibles cuando hay más de un slot */}
      {multi && (
        <div className="flex justify-center gap-1.5 pb-3 -mt-0.5">
          {slots.map((_, i) => (
            <button
              key={i}
              onClick={() =>
                scrollRef.current?.scrollTo({
                  left: i * scrollRef.current.clientWidth,
                  behavior: "smooth",
                })
              }
              aria-label={`Quiniela ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx ? "w-4 bg-blue-400" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
