import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle, StatPill } from "@/components/PageTitle";
import { LayoutGrid } from "lucide-react";
import { GroupCard } from "./GroupCard";

export default async function GruposPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [groups, allTeams] = await Promise.all([
    prisma.groupPool.findMany({
      orderBy: { name: "asc" },
      include: { bets: { where: { userId }, select: { teamId: true, position: true } } },
    }),
    prisma.team.findMany({
      where: { group: { not: null } },
      select: { id: true, name: true, code: true, flag: true, group: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const openCount = groups.filter((g) => g.isOpen).length;
  const betCount = groups.filter((g) => g.bets.length > 0).length;

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          icon={LayoutGrid}
          accent="green"
          title="Fase de Grupos"
          subtitle="Predice el 1°–4° de cada grupo. Solo la posición exacta suma puntos."
          right={<StatPill>{betCount}/{groups.length}</StatPill>}
        />

        {openCount > 0 && (
          <div className="animate-rise mb-4 flex items-center gap-2 rounded-xl bg-green-400/[0.08] border border-green-400/20 px-3.5 py-2.5 text-xs font-medium text-green-300">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {openCount} grupo{openCount !== 1 ? "s" : ""} abierto{openCount !== 1 ? "s" : ""} para apostar
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g, i) => (
            <div key={g.id} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
              <GroupCard
                groupPoolId={g.id}
                groupName={g.name}
                price={Number(g.price)}
                isOpen={g.isOpen}
                teams={allTeams.filter((t) => t.group === g.name)}
                existingBets={g.bets}
              />
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
