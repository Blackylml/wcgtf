"use client";

import { useEffect, useState } from "react";

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono font-bold text-3xl sm:text-4xl text-white tabular-nums leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-2 text-[10px] font-semibold text-slate-400/90 uppercase tracking-[0.18em]">
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return (
    <span className="font-mono font-bold text-2xl sm:text-3xl text-green-400/50 leading-none -mt-3 select-none">
      :
    </span>
  );
}

export function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    const targetMs = new Date(target).getTime();
    const update = () => setDiff(targetMs - Date.now());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff === null) return <div className="h-12" />;

  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-2 text-green-400 font-bold text-lg">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        En juego
      </span>
    );
  }

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);

  return (
    <div className="flex items-start justify-center gap-3 sm:gap-4">
      <Unit value={d} label="días" />
      <Colon />
      <Unit value={h} label="hrs" />
      <Colon />
      <Unit value={m} label="min" />
      <Colon />
      <Unit value={s} label="seg" />
    </div>
  );
}
