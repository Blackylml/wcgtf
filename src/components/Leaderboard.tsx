import type { LeaderRow } from "@/lib/module-access";
import { WinnerStar } from "@/components/WinnerStar";
import { Trophy } from "lucide-react";

const RANK_COLOR = ["text-amber-300", "text-slate-200", "text-orange-300"];

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto de perfil de Google
      <img src={image} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover ring-1 ring-white/15 shrink-0" />
    );
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="grid place-items-center w-6 h-6 rounded-full bg-white/[0.08] ring-1 ring-white/10 text-[9px] font-bold text-slate-300 shrink-0">
      {initials || "?"}
    </span>
  );
}

/** Ranking de una quiniela: participantes confirmados ordenados por aciertos. */
export function Leaderboard({ rows, currentUserId, winnerIds }: { rows: LeaderRow[]; currentUserId?: string; winnerIds?: string[] }) {
  const ranked = rows.some((r) => r.points > 0);
  const winners = new Set(winnerIds ?? []);
  return (
    <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden mt-3">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <Trophy size={15} className="text-amber-400" />
        <h3 className="font-display text-sm font-bold text-white">Ranking</h3>
        <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.05] border border-white/10 rounded-full px-2 py-0.5">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 px-4 py-4">Aún nadie con pago confirmado.</p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {rows.map((r, i) => {
              const isMe = r.id === currentUserId;
              return (
                <tr key={r.id} className={`border-b border-white/[0.05] last:border-0 ${isMe ? "bg-green-400/[0.08]" : ""}`}>
                  <td className={`px-3 py-2.5 font-mono font-bold w-8 ${ranked && i < 3 ? RANK_COLOR[i] : "text-slate-500"}`}>{i + 1}</td>
                  <td className="px-1 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={r.name} image={r.image} />
                      <span className="text-slate-200 truncate">{r.name.split(" ").slice(0, 2).join(" ")}</span>
                      {winners.has(r.id) && <WinnerStar />}
                      {isMe && <span className="text-[10px] font-semibold text-green-400 shrink-0">tú</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
