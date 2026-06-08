import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { redirect } from "next/navigation";
import { SpecialCategory } from "@/generated/prisma/client";
import { Check, X, Clock, Crown } from "lucide-react";

const SPECIAL_LABELS: Record<SpecialCategory, string> = {
  TOP_SCORER: "Goleador",
  BEST_PLAYER: "Jugador del Torneo",
  BEST_GOALKEEPER: "Mejor Portero",
  BEST_YOUNG_PLAYER: "Mejor Joven",
};

function StatusIcon({ v }: { v: boolean | null }) {
  if (v === true) return <Check size={11} className="text-green-400 shrink-0" />;
  if (v === false) return <X size={11} className="text-red-400 shrink-0" />;
  return <Clock size={10} className="text-slate-600 shrink-0" />;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [groupBets, matchBets, specialBets, bracketBet, allUsers] = await Promise.all([
    prisma.groupBet.findMany({
      where: { userId },
      include: { groupPool: true, team: true },
      orderBy: [{ groupPool: { name: "asc" } }, { position: "asc" }],
    }),
    prisma.matchBet.findMany({
      where: { userId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { scheduledAt: "asc" } },
    }),
    prisma.specialBet.findMany({
      where: { userId },
      include: { player: { include: { team: true } } },
    }),
    prisma.bracketBet.findFirst({ where: { userId }, select: { score: true } }),
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        matchBets: { where: { isCorrect: true, OR: [{ paymentId: null }, { payment: { status: "APPROVED" } }] } },
        groupBets: { where: { isCorrect: true, OR: [{ paymentId: null }, { payment: { status: "APPROVED" } }] } },
        specialBets: { where: { isCorrect: true, OR: [{ paymentId: null }, { payment: { status: "APPROVED" } }] } },
        bracketBets: { where: { OR: [{ paymentId: null }, { payment: { status: "APPROVED" } }] }, select: { score: true } },
      },
    }),
  ]);

  const standings = allUsers
    .map((u) => ({
      id: u.id, name: u.name ?? u.email ?? "—",
      matchScore: u.matchBets.length,
      groupScore: u.groupBets.length,
      specialScore: u.specialBets.length,
      bracketScore: u.bracketBets.reduce((s, b) => s + b.score, 0),
    }))
    .map((u) => ({ ...u, total: u.matchScore + u.groupScore + u.specialScore + u.bracketScore }))
    .sort((a, b) => b.total - a.total);

  const myRank = standings.findIndex((u) => u.id === userId) + 1;
  const myStats = standings.find((u) => u.id === userId);
  const top3 = standings.slice(0, 3);

  const groupBetMap = groupBets.reduce((acc, b) => {
    const k = b.groupPool.name;
    if (!acc[k]) acc[k] = [];
    acc[k].push(b);
    return acc;
  }, {} as Record<string, typeof groupBets>);

  const correctMatches = matchBets.filter((b) => b.isCorrect === true).length;
  const gradedMatches = matchBets.filter((b) => b.isCorrect !== null).length;

  const PODIUM_COLORS = ["text-amber-300", "text-slate-200", "text-orange-300"];
  const PODIUM_SIZES = ["text-3xl", "text-2xl", "text-2xl"];
  const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        {/* My rank — featured hero */}
        <div className="animate-rise mb-5 relative overflow-hidden rounded-3xl border border-white/10 stadium-bg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
          <div className="absolute inset-0 stadium-lines" />
          <div className="relative p-5 sm:p-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold text-green-400 uppercase tracking-[0.18em] mb-2">Mi posición</p>
              <p className="font-display text-6xl font-extrabold text-white leading-none tabular-nums">
                #{myRank || "—"}
              </p>
              <p className="text-xs text-slate-400 mt-2">de {standings.length} participantes</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.16em] mb-1">Puntos</p>
              <p className="font-display text-4xl font-extrabold text-amber-300 leading-none tabular-nums">{myStats?.total ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Podium */}
        {top3.length >= 2 && (
          <div className="animate-rise mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5" style={{ animationDelay: "80ms" }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold mb-5 text-center">Top 3</p>
            <div className="flex items-end justify-center gap-4">
              {PODIUM_ORDER.map((idx) => {
                const user = top3[idx];
                if (!user) return <div key={idx} className="w-20" />;
                const isGold = idx === 0;
                return (
                  <div key={user.id} className="flex flex-col items-center gap-1.5">
                    {isGold && <Crown size={18} className="text-amber-300 -mb-0.5" />}
                    <span className={`font-display font-extrabold ${PODIUM_SIZES[idx]} ${PODIUM_COLORS[idx]} tabular-nums`}>
                      {user.total}
                    </span>
                    <p className={`text-xs font-semibold truncate max-w-[80px] text-center ${user.id === userId ? "text-green-400" : "text-white"}`}>
                      {user.name.split(" ")[0]}
                    </p>
                    <div className={`flex items-center justify-center rounded-t-xl text-xs font-extrabold text-white w-16 ${
                      isGold ? "h-16 bg-gradient-to-t from-amber-500/10 to-amber-400/30 border border-amber-400/30" :
                      idx === 1 ? "h-11 bg-gradient-to-t from-slate-500/5 to-slate-400/20 border border-slate-400/20" :
                      "h-9 bg-gradient-to-t from-orange-700/5 to-orange-500/20 border border-orange-500/20"
                    }`}>
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full standings table */}
        <div className="animate-rise mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden" style={{ animationDelay: "140ms" }}>
          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <h2 className="font-display text-sm font-bold">Tabla General</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Jugador</th>
                  <th className="px-3 py-2 text-right">G</th>
                  <th className="px-3 py-2 text-right">P</th>
                  <th className="px-3 py-2 text-right">E</th>
                  <th className="px-3 py-2 text-right">B</th>
                  <th className="px-3 py-2 text-right font-bold text-white">Tot</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((u, i) => (
                  <tr key={u.id}
                    className={`border-b border-white/[0.05] ${u.id === userId ? "bg-green-400/[0.08]" : "hover:bg-white/[0.03]"}`}>
                    <td className={`px-3 py-2.5 font-mono ${i < 3 ? "text-amber-300 font-bold" : "text-slate-500"}`}>{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-white">
                      {u.name.split(" ")[0]}
                      {u.id === userId && <span className="ml-1 text-[10px] font-semibold text-green-400">tú</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.groupScore}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.matchScore}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.specialScore}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.bracketScore}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">{u.total}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-600">Sin participantes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My bets */}
        <div className="grid grid-cols-1 gap-3">
          {/* Match bets */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Mis partidos</h2>
              <span className="text-xs text-slate-500">{correctMatches}/{gradedMatches} correctos</span>
            </div>
            <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
              {matchBets.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Sin apuestas</p>
              ) : matchBets.map((bet) => {
                const m = bet.match;
                const home = m.homeTeam?.name ?? m.homeLabel ?? "?";
                const away = m.awayTeam?.name ?? m.awayLabel ?? "?";
                const pickLabel = bet.pick === "HOME" ? home : bet.pick === "AWAY" ? away : "Empate";
                return (
                  <div key={bet.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 truncate">{home} vs {away}</span>
                    <span className={`text-xs font-medium flex items-center gap-1 shrink-0 ${
                      bet.isCorrect === true ? "text-green-400" : bet.isCorrect === false ? "text-red-400" : "text-slate-500"
                    }`}>
                      <StatusIcon v={bet.isCorrect} />
                      {pickLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group bets */}
          {Object.keys(groupBetMap).length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="font-display text-sm font-bold">Mis grupos</h2>
              </div>
              <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                {Object.entries(groupBetMap).map(([gName, bets]) => (
                  <div key={gName} className="px-4 py-2.5">
                    <p className="text-[11px] text-slate-500 mb-1">Grupo {gName}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {bets.sort((a, b) => a.position - b.position).map((b) => (
                        <div key={b.id} className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-600 w-4">{b.position}°</span>
                          <span className="text-slate-300 truncate">{b.team.flag} {b.team.name}</span>
                          <StatusIcon v={b.isCorrect} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specials */}
          {specialBets.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="font-display text-sm font-bold">Premios especiales</h2>
              </div>
              <div className="divide-y divide-white/5">
                {specialBets.map((b) => (
                  <div key={b.id} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{SPECIAL_LABELS[b.category]}</span>
                    <span className={`text-xs font-medium flex items-center gap-1 ${
                      b.isCorrect === true ? "text-green-400" : b.isCorrect === false ? "text-red-400" : "text-slate-400"
                    }`}>
                      <StatusIcon v={b.isCorrect} />
                      {b.player.team.flag} {b.player.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bracket */}
          {bracketBet && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Bracket</span>
              <a href="/bracket" className="text-xs text-blue-400 hover:underline">
                Ver · {bracketBet.score} pts
              </a>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
