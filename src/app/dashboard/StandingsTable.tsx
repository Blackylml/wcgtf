"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

export type Standing = {
  id: string;
  name: string;
  image: string | null;
  total: number;
  groupScore: number;
  g1Score: number;
  g2Score: number;
  g3Score: number;
  specialScore: number;
  bracketScore: number;
};

const TABS = [
  { key: "total", label: "General", metric: (r: Standing) => r.total },
  { key: "group", label: "Grupos", metric: (r: Standing) => r.groupScore },
  { key: "g1", label: "Jornada 1", metric: (r: Standing) => r.g1Score },
  { key: "g2", label: "Jornada 2", metric: (r: Standing) => r.g2Score },
  { key: "g3", label: "Jornada 3", metric: (r: Standing) => r.g3Score },
  { key: "special", label: "Especiales", metric: (r: Standing) => r.specialScore },
  { key: "bracket", label: "Bracket", metric: (r: Standing) => r.bracketScore },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const RANK_COLOR = ["text-amber-300", "text-slate-200", "text-orange-300"];

/** Nombre + primer apellido (primeras dos palabras). */
function displayName(name: string) {
  return name.split(" ").slice(0, 2).join(" ");
}

const AV_SIZE = {
  sm: "w-6 h-6 text-[9px] ring-1 ring-white/15",
  lg: "w-11 h-11 text-sm ring-2 ring-white/15",
  xl: "w-14 h-14 text-base ring-2 ring-amber-400/60",
} as const;

function Avatar({ name, image, size = "sm" }: { name: string; image: string | null; size?: keyof typeof AV_SIZE }) {
  const cls = AV_SIZE[size];
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto de perfil de Google
      <img src={image} alt="" className={`${cls} rounded-full object-cover shrink-0`} referrerPolicy="no-referrer" />
    );
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className={`${cls} rounded-full bg-white/[0.08] grid place-items-center font-bold text-slate-300 shrink-0`}>
      {initials || "?"}
    </span>
  );
}

const PODIUM_ORDER = [1, 0, 2]; // plata, oro, bronce
const PODIUM_COLORS = ["text-amber-300", "text-slate-200", "text-orange-300"];
const PODIUM_SIZES = ["text-2xl", "text-xl", "text-xl"];
const PODIUM_BAR = [
  "h-14 bg-gradient-to-t from-amber-500/10 to-amber-400/30 border border-amber-400/30",
  "h-10 bg-gradient-to-t from-slate-500/5 to-slate-400/20 border border-slate-400/20",
  "h-8 bg-gradient-to-t from-orange-700/5 to-orange-500/20 border border-orange-500/20",
];

export function StandingsTable({ standings, currentUserId }: { standings: Standing[]; currentUserId: string }) {
  const [tab, setTab] = useState<TabKey>("total");
  const active = TABS.find((t) => t.key === tab)!;
  const isTotal = tab === "total";

  const sorted = [...standings].sort((a, b) => active.metric(b) - active.metric(a) || b.total - a.total);
  const podium = sorted.slice(0, 3);

  return (
    <div className="animate-rise mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden" style={{ animationDelay: "140ms" }}>
      <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.06]">
        <h2 className="font-display text-sm font-bold mb-3">Ranking</h2>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[0_6px_18px_-8px_rgba(34,224,122,0.9)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Podio de la apuesta seleccionada */}
      {podium.length >= 2 && (
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <div className="flex items-end justify-center gap-5">
            {PODIUM_ORDER.map((i) => {
              const u = podium[i];
              if (!u) return <div key={i} className="w-16" />;
              const isGold = i === 0;
              const isMe = u.id === currentUserId;
              return (
                <div key={u.id} className="flex flex-col items-center gap-1.5">
                  {isGold && <Crown size={16} className="text-amber-300 -mb-0.5" />}
                  <Avatar name={u.name} image={u.image} size={isGold ? "xl" : "lg"} />
                  <span className={`font-display font-extrabold tabular-nums ${PODIUM_SIZES[i]} ${PODIUM_COLORS[i]}`}>{active.metric(u)}</span>
                  <span className={`text-xs font-semibold truncate max-w-[72px] text-center ${isMe ? "text-green-400" : "text-white"}`}>
                    {u.name.split(" ")[0]}
                  </span>
                  <div className={`flex items-center justify-center rounded-t-xl text-xs font-extrabold text-white w-16 ${PODIUM_BAR[i]}`}>
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Jugador</th>
              <th className="px-3 py-2 text-right font-bold text-white">Pts</th>
              {!isTotal && <th className="px-3 py-2 text-right text-slate-600">Total</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((u, i) => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-b border-white/[0.05] ${isMe ? "bg-green-400/[0.08]" : "hover:bg-white/[0.03]"}`}>
                  <td className={`px-3 py-2.5 font-mono font-bold ${i < 3 ? RANK_COLOR[i] : "text-slate-500"}`}>{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={u.name} image={u.image} />
                      <span className="font-medium text-white truncate">{displayName(u.name)}</span>
                      {isMe && <span className="text-[10px] font-semibold text-green-400 shrink-0">tú</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">{active.metric(u)}</td>
                  {!isTotal && <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{u.total}</td>}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={isTotal ? 3 : 4} className="px-3 py-8 text-center text-slate-600">Sin participantes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
