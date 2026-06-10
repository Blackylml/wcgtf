import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle, StatPill } from "@/components/PageTitle";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import { getModuleAccess } from "@/lib/module-access";
import { MODULE_META, GROUP_MATCH_QUINIELAS, matchModule } from "@/lib/modules";
import { MatchCard } from "./MatchCard";
import { Stage, Module } from "@/generated/prisma/client";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Grupos", R32: "R32", R16: "R16", QF: "Cuartos",
  SF: "Semis", THIRD: "3er lugar", FINAL: "Final",
};

const STAGE_ORDER: Stage[] = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"];

type MatchRow = Awaited<ReturnType<typeof loadMatches>>[number];
async function loadMatches(userId: string) {
  return prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: { select: { name: true, flag: true, code: true } },
      awayTeam: { select: { name: true, flag: true, code: true } },
      bets: { where: { userId }, select: { pick: true, payment: { select: { status: true } } } },
    },
  });
}

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { stage: stageParam } = await searchParams;

  const matches = await loadMatches(userId);

  const availableStages = STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s));
  const activeStage: Stage = (availableStages.includes(stageParam as Stage) ? stageParam : availableStages[0]) as Stage ?? "GROUP";

  const filtered = matches.filter((m) => m.stage === activeStage);
  const openCount = filtered.filter((m) => m.isOpen).length;
  const bettedCount = filtered.filter((m) => m.bets.length > 0).length;
  const isGroup = activeStage === "GROUP";

  // Acceso a cada quiniela relevante.
  const [g1, g2, g3, mk] = await Promise.all([
    getModuleAccess(userId, "MATCHES_G1"),
    getModuleAccess(userId, "MATCHES_G2"),
    getModuleAccess(userId, "MATCHES_G3"),
    getModuleAccess(userId, "MATCHES"),
  ]);
  const accessByModule: Record<string, typeof g1> = {
    MATCHES_G1: g1, MATCHES_G2: g2, MATCHES_G3: g3, MATCHES: mk,
  };
  const enabledFor = (m: MatchRow) => accessByModule[matchModule(m.stage, m.matchNumber)].entered;

  const renderCard = (m: MatchRow, i: number) => (
    <div key={m.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
      <MatchCard
        match={{
          id: m.id,
          matchNumber: m.matchNumber,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeLabel: m.homeLabel,
          awayLabel: m.awayLabel,
          stage: m.stage,
          scheduledAt: m.scheduledAt,
          venue: m.venue,
          isOpen: m.isOpen,
          price: Number(m.price),
          penaltiesAllowed: m.penaltiesAllowed,
          userBet: m.bets[0]?.pick ?? null,
          paymentStatus: m.bets[0]?.payment?.status ?? null,
          enabled: enabledFor(m),
        }}
      />
    </div>
  );

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto pb-28">
        <div className="px-4 pt-5">
          <PageTitle
            icon={CalendarDays}
            accent="blue"
            title="Partidos"
            subtitle="Apuesta por el resultado de cada partido. La fase de grupos son 3 quinielas por jornada."
            right={<StatPill>{bettedCount}/{filtered.length}</StatPill>}
          />
        </div>

        {/* Stage tabs */}
        <div className="animate-rise flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {availableStages.map((s) => {
            const isActive = s === activeStage;
            const hasOpen = matches.some((m) => m.stage === s && m.isOpen);
            return (
              <Link
                key={s}
                href={`/partidos?stage=${s}`}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_6px_18px_-8px_rgba(59,157,255,0.9)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {STAGE_LABELS[s]}
                {hasOpen && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />}
              </Link>
            );
          })}
        </div>

        <div className="px-4">
          {filtered.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-10">Sin partidos en esta fase.</p>
          ) : isGroup ? (
            // Fase de grupos → 3 quinielas por jornada
            GROUP_MATCH_QUINIELAS.map((q) => {
              const qMatches = filtered.filter((m) => m.matchNumber >= q.min && m.matchNumber <= q.max);
              if (qMatches.length === 0) return null;
              const access = accessByModule[q.module];
              const betted = qMatches.filter((m) => m.bets.length > 0).length;
              return (
                <section key={q.module} className="mb-7">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-display text-base font-bold text-white">{q.label} <span className="text-xs font-normal text-slate-500">· partidos {q.min}–{q.max}</span></h2>
                    <StatPill>{betted}/{qMatches.length}</StatPill>
                  </div>
                  <ModuleEntryGate
                    module={q.module as Module}
                    label={MODULE_META[q.module as Module].label}
                    accent={MODULE_META[q.module as Module].accent}
                    price={access.price}
                    paymentStatus={access.paymentStatus}
                    entryOpen={access.entryOpen}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {qMatches.map((m, i) => renderCard(m, i))}
                  </div>
                </section>
              );
            })
          ) : (
            // Eliminatorias → módulo único
            <>
              <ModuleEntryGate
                module="MATCHES"
                label={MODULE_META.MATCHES.label}
                accent={MODULE_META.MATCHES.accent}
                price={mk.price}
                paymentStatus={mk.paymentStatus}
                entryOpen={mk.entryOpen}
              />
              {openCount > 0 && (
                <div className="animate-rise pb-3 flex items-center gap-1.5 text-xs text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {openCount} abierto{openCount !== 1 ? "s" : ""}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((m, i) => renderCard(m, i))}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
