import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { Swords } from "lucide-react";
import { DuelCard } from "./DuelCard";

export default async function DuelosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [sessions, user] = await Promise.all([
    prisma.duelSession.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        entries: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        pairs: {
          include: {
            user1: { select: { id: true, name: true, email: true, image: true } },
            user2: { select: { id: true, name: true, email: true, image: true } },
            winner: { select: { id: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, name: true, image: true },
    }),
  ]);

  const credits = Number(user?.credits ?? 0);
  const currentUser = {
    name: user?.name ?? session.user.name ?? "Tú",
    image: user?.image ?? session.user.image ?? null,
  };

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          title="Duelos 1v1"
          icon={Swords}
          accent="red"
          subtitle="Apuesta créditos y enfrenta a otro participante jornada por jornada"
          right={
            <span className="text-sm font-semibold text-amber-300 tabular-nums">
              ${credits.toFixed(0)} cr
            </span>
          }
        />

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-slate-600">
            <Swords size={44} className="opacity-20" />
            <p className="text-sm font-medium">No hay duelos disponibles aún.</p>
            <p className="text-xs text-center max-w-[240px]">
              El admin activará la primera sesión antes de que empiece la jornada.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const userEntry = s.entries.find((e) => e.userId === userId) ?? null;
              const userPair = s.pairs.find((p) => p.user1Id === userId || p.user2Id === userId) ?? null;
              const iAmUser1 = userPair?.user1Id === userId;
              const rival = userPair
                ? iAmUser1 ? userPair.user2 : userPair.user1
                : null;
              const myScore = userPair ? (iAmUser1 ? userPair.score1 : userPair.score2) : null;
              const rivalScore = userPair ? (iAmUser1 ? userPair.score2 : userPair.score1) : null;
              const winnerId = userPair?.winner?.id ?? null;

              return (
                <DuelCard
                  key={s.id}
                  session={{
                    id: s.id,
                    label: s.label,
                    entryFee: Number(s.entryFee),
                    houseCutPct: s.houseCutPct,
                    isOpen: s.isOpen,
                    pairingDone: s.pairingDone,
                    participantCount: s.entries.length,
                  }}
                  userEntry={userEntry
                    ? { paired: userEntry.paired, refunded: userEntry.refunded }
                    : null}
                  userPair={userPair
                    ? {
                        id: userPair.id,
                        prizePool: Number(userPair.prizePool),
                        myScore,
                        rivalScore,
                        iWon: winnerId === userId,
                        iLost: winnerId != null && winnerId !== userId,
                        isTie:
                          myScore != null &&
                          rivalScore != null &&
                          winnerId == null,
                        prizeGiven: userPair.prizeGiven,
                      }
                    : null}
                  rival={rival
                    ? {
                        id: rival.id,
                        name: rival.name ?? rival.email ?? "Rival",
                        image: rival.image ?? null,
                      }
                    : null}
                  participants={s.entries.map((e) => ({
                    name: e.user.name ?? e.user.email ?? "?",
                    image: e.user.image ?? null,
                  }))}
                  userCredits={credits}
                  currentUser={currentUser}
                />
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
