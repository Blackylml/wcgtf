import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle, StatPill } from "@/components/PageTitle";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import { getModuleAccess } from "@/lib/module-access";
import { MODULE_META } from "@/lib/modules";
import { SpecialCard } from "./SpecialCard";
import { SpecialCategory } from "@/generated/prisma/client";
import { Star } from "lucide-react";

const CATEGORIES: { key: SpecialCategory; label: string; iconName: string }[] = [
  { key: "TOP_SCORER", label: "Goleador del torneo", iconName: "Trophy" },
  { key: "BEST_PLAYER", label: "Jugador del torneo", iconName: "Star" },
  { key: "BEST_GOALKEEPER", label: "Mejor portero", iconName: "Shield" },
  { key: "BEST_YOUNG_PLAYER", label: "Mejor jugador joven", iconName: "Award" },
];

export default async function EspecialesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [pools, players, bets, access] = await Promise.all([
    prisma.specialPool.findMany(),
    prisma.player.findMany({
      include: { team: { select: { name: true, flag: true } } },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.specialBet.findMany({
      where: { userId },
      include: { player: { include: { team: { select: { name: true, flag: true } } } } },
    }),
    getModuleAccess(userId, "SPECIALS"),
  ]);

  const betMap = new Map(bets.map((b) => [b.category, { player: b.player }]));

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          icon={Star}
          accent="purple"
          title="Premios Especiales"
          subtitle="Se revelan al final del torneo. Una sola entrada cubre las 4 categorías."
          right={<StatPill>{bets.length}/4</StatPill>}
        />

        <ModuleEntryGate
          module="SPECIALS"
          label={MODULE_META.SPECIALS.label}
          accent={MODULE_META.SPECIALS.accent}
          price={access.price}
          paymentStatus={access.paymentStatus}
          entryOpen={access.entryOpen}
        />

        {players.length === 0 ? (
          <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
            <p className="text-slate-500 text-sm">El admin aún no ha cargado los jugadores.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label, iconName }, i) => {
              const pool = pools.find((p) => p.category === key);
              return (
                <div key={key} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <SpecialCard
                    category={key}
                    label={label}
                    iconName={iconName}
                    isOpen={pool?.isOpen ?? false}
                    enabled={access.entered}
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
