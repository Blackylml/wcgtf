import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle, StatPill } from "@/components/PageTitle";
import { SpecialCard } from "./SpecialCard";
import { SpecialCategory } from "@/generated/prisma/client";
import { Trophy, Shield, Award, Star } from "lucide-react";

const CATEGORIES: { key: SpecialCategory; label: string; icon: React.ElementType }[] = [
  { key: "TOP_SCORER", label: "Goleador del torneo", icon: Trophy },
  { key: "BEST_PLAYER", label: "Jugador del torneo", icon: Star },
  { key: "BEST_GOALKEEPER", label: "Mejor portero", icon: Shield },
  { key: "BEST_YOUNG_PLAYER", label: "Mejor jugador joven", icon: Award },
];

export default async function EspecialesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [pools, players, bets] = await Promise.all([
    prisma.specialPool.findMany(),
    prisma.player.findMany({
      include: { team: { select: { name: true, flag: true } } },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.specialBet.findMany({
      where: { userId },
      include: { player: { include: { team: { select: { name: true, flag: true } } } } },
    }),
  ]);

  const betMap = new Map(bets.map((b) => [b.category, b]));

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          icon={Star}
          accent="purple"
          title="Premios Especiales"
          subtitle="Se revelan al final del torneo. Cada categoría tiene su propia bolsa."
          right={<StatPill>{bets.length}/4</StatPill>}
        />

        {players.length === 0 ? (
          <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
            <p className="text-slate-500 text-sm">El admin aún no ha cargado los jugadores.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label, icon }, i) => {
              const pool = pools.find((p) => p.category === key);
              return (
                <div key={key} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <SpecialCard
                    category={key}
                    label={label}
                    icon={icon}
                    price={pool ? Number(pool.price) : 0}
                    isOpen={pool?.isOpen ?? false}
                    players={players}
                    existingBet={betMap.get(key) ?? null}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
