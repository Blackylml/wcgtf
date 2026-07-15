import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { LMX_JORNADAS } from "@/lib/modules";
import { Module } from "@/generated/prisma/client";
import { Trophy, Medal } from "lucide-react";

type WinnerRow = {
  quiniela: string;
  winnerName: string;
  winnerImage: string | null;
  aciertos: number;
  prize: number;
};

async function getPastWinners(): Promise<WinnerRow[]> {
  const allMatches = await prisma.match.findMany({
    where: { stage: "JORNADA", matchNumber: { gte: 1001, lte: 9000 } },
    select: { matchNumber: true, homeScore: true },
  });

  const completedJornadas = LMX_JORNADAS.filter((j) => {
    const inRange = allMatches.filter((m) => m.matchNumber >= j.min && m.matchNumber <= j.max);
    return inRange.length > 0 && inRange.every((m) => m.homeScore !== null);
  });

  const rows = await Promise.all(
    completedJornadas.map(async (j) => {
      const top = await prisma.matchBet.groupBy({
        by: ["userId"],
        where: { poolModule: j.module as Module, isCorrect: true },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });
      const topEntry = top[0];
      if (!topEntry) return null;

      const winner = await prisma.user.findUnique({
        where: { id: topEntry.userId },
        select: { name: true, image: true, email: true },
      });
      const prizeAgg = await prisma.payment.aggregate({
        where: { module: j.module as Module, status: "APPROVED" },
        _sum: { amount: true },
      });

      return {
        quiniela: j.label,
        winnerName: winner?.name ?? winner?.email ?? "—",
        winnerImage: winner?.image ?? null,
        aciertos: topEntry._count.id,
        prize: Number(prizeAgg._sum.amount ?? 0),
      };
    })
  );

  return rows.filter((r): r is WinnerRow => r !== null);
}

export default async function GanadoresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const winners = await getPastWinners();

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          title="Ganadores"
          icon={Trophy}
          accent="amber"
          subtitle="Historial de ganadores por quiniela"
        />

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          {winners.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
              <Medal size={36} className="opacity-20" />
              <p className="text-sm font-medium text-center">
                Aún no hay ganadores registrados.
              </p>
              <p className="text-xs text-center max-w-[220px]">
                Aquí aparecerá el ganador de cada jornada una vez que terminen los partidos.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-[11px] uppercase tracking-wider border-b border-white/[0.07]">
                  <th className="text-left pb-3 font-semibold">Quiniela</th>
                  <th className="text-left pb-3 font-semibold">Ganador</th>
                  <th className="text-right pb-3 font-semibold tabular-nums">Aciertos</th>
                  <th className="text-right pb-3 font-semibold tabular-nums">Premio</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-3 text-slate-300 font-medium">{w.quiniela}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {w.winnerImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.winnerImage}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-amber-400/30"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-amber-400/15 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
                            <Trophy size={12} className="text-amber-400" />
                          </span>
                        )}
                        <span className="text-white font-semibold truncate">{w.winnerName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-amber-300 font-bold tabular-nums">{w.aciertos}</td>
                    <td className="py-3 text-right tabular-nums">
                      {w.prize > 0 ? (
                        <span className="text-emerald-300 font-semibold">${w.prize.toFixed(0)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
