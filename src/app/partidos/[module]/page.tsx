import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import { Leaderboard } from "@/components/Leaderboard";
import { getModuleAccess, getGroupQuinielaRanks, isLocked, getQuinielaLeaderboard, getLastJornadaWinners } from "@/lib/module-access";
import { GROUP_MATCH_QUINIELAS, KO_QUINIELAS, MODULE_META } from "@/lib/modules";
import { Module, Stage } from "@/generated/prisma/client";
import { MatchCard } from "../MatchCard";
import { QuinielaSection } from "../QuinielaSection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Grupos", R32: "R32", R16: "R16", QF: "Cuartos", SF: "Semis", THIRD: "3er lugar", FINAL: "Final",
  JORNADA: "Jornada", LIG_QF: "Cuartos", LIG_SF: "Semis", LIG_FINAL: "Final",
};
const KO_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];
const VALID = new Set<string>([
  ...GROUP_MATCH_QUINIELAS.map((q) => q.module),
  ...KO_QUINIELAS.map((q) => q.module),
  "MATCHES",
]);

const fmtLock = (ms: number) =>
  new Date(ms).toLocaleString("es-MX", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Monterrey" });

function BackBar() {
  return (
    <Link href="/partidos" className="animate-rise inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-3">
      <ArrowLeft size={16} /> Quinielas
    </Link>
  );
}

export default async function QuinielaDetailPage({
  params, searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { module: moduleParam } = await params;
  if (!VALID.has(moduleParam)) redirect("/partidos");
  const mod = moduleParam as Module;

  const session = await auth();
  const userId = session!.user.id;

  const access = await getModuleAccess(userId, mod);

  // ── Eliminatorias ──────────────────────────────────────────────
  if (mod === "MATCHES") {
    const { stage: stageParam } = await searchParams;
    const matches = await prisma.match.findMany({
      where: { stage: { not: "GROUP" } },
      orderBy: { matchNumber: "asc" },
      include: {
        homeTeam: { select: { name: true, flag: true, code: true } },
        awayTeam: { select: { name: true, flag: true, code: true } },
        bets: { where: { userId, poolModule: "MATCHES" }, select: { pick: true, payment: { select: { status: true } } } },
      },
    });
    // Los partidos con precio propio van en "Destacados", no en la quiniela de eliminatorias.
    const covered = matches.filter((m) => Number(m.price) === 0);
    const stages = KO_ORDER.filter((s) => covered.some((m) => m.stage === s));
    const activeStage = (stages.includes(stageParam as Stage) ? stageParam : stages[0]) as Stage ?? "R32";
    const filtered = covered.filter((m) => m.stage === activeStage);
    const participants = await getQuinielaLeaderboard("MATCHES");
    const winnerIds = [...(await getLastJornadaWinners())];

    return (
      <div className="app-shell min-h-screen text-white">
        <AppHeader />
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
          <BackBar />
          <h1 className="font-display text-2xl font-extrabold mb-4">Eliminatorias</h1>
          <ModuleEntryGate module="MATCHES" label={MODULE_META.MATCHES.label} accent={MODULE_META.MATCHES.accent} price={access.price} paymentStatus={access.paymentStatus} entryOpen={access.entryOpen} />

          <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
            {stages.map((s) => (
              <Link key={s} href={`/partidos/MATCHES?stage=${s}`}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${s === activeStage ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"}`}>
                {STAGE_LABELS[s]}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((m, i) => {
              const ko = m.bets[0];
              return (
                <div key={m.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <MatchCard match={{
                    id: m.id, matchNumber: m.matchNumber, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                    homeLabel: m.homeLabel, awayLabel: m.awayLabel, stage: m.stage, scheduledAt: m.scheduledAt,
                    venue: m.venue, isOpen: m.isOpen, price: Number(m.price), penaltiesAllowed: m.penaltiesAllowed,
                    userBet: ko?.pick ?? null, paymentStatus: ko?.payment?.status ?? null, enabled: access.entered,
                  }} />
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-slate-600 text-sm col-span-2 text-center py-10">Sin partidos en esta fase.</p>}
          </div>
          <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Quiniela por ronda eliminatoria (KO_R32 … KO_FINAL) ───────
  const koQ = KO_QUINIELAS.find((q) => q.module === mod);
  if (koQ) {
    if (!koQ.available) redirect("/partidos");
    const [matches, participants, winners, savedTb] = await Promise.all([
      prisma.match.findMany({
        where: { stage: { in: koQ.stages } },
        orderBy: { matchNumber: "asc" },
        include: {
          homeTeam: { select: { name: true, flag: true, code: true } },
          awayTeam: { select: { name: true, flag: true, code: true } },
          bets: { where: { userId, poolModule: mod }, select: { pick: true } },
        },
      }),
      getQuinielaLeaderboard(mod),
      getLastJornadaWinners(),
      prisma.koTiebreaker.findUnique({ where: { userId_module: { userId, module: mod } } }),
    ]);
    const winnerIds = [...winners];
    const lockMs = matches.length ? Math.min(...matches.map((m) => m.scheduledAt.getTime())) : 0;
    const lockDate = new Date(lockMs);

    // Equipos únicos de la ronda para el selector de desempate
    const teams = [...new Map(
      matches.flatMap((m) => [
        m.homeTeam ? [m.homeTeam.code, m.homeTeam] as [string, typeof m.homeTeam] : null,
        m.awayTeam ? [m.awayTeam.code, m.awayTeam] as [string, typeof m.awayTeam] : null,
      ].filter((x): x is [string, NonNullable<typeof m.homeTeam>] => x !== null))
    ).values()].filter(Boolean);

    return (
      <div className="app-shell min-h-screen text-white">
        <AppHeader />
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
          <BackBar />
          {matches.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">Los partidos de esta ronda aún no están disponibles.</p>
            </div>
          ) : (
            <QuinielaSection
              module={mod}
              label={koQ.label}
              accent={MODULE_META[mod].accent}
              locked={isLocked(lockDate)}
              lockLabel={fmtLock(lockMs)}
              standing={null}
              access={{ price: access.price, paymentStatus: access.paymentStatus, entryOpen: access.entryOpen, entered: access.entered }}
              matches={matches.map((m) => ({
                id: m.id,
                matchNumber: m.matchNumber,
                homeName: m.homeTeam?.name ?? m.homeLabel ?? "Por definir",
                homeFlag: m.homeTeam?.flag ?? null,
                homeCode: m.homeTeam?.code ?? null,
                awayName: m.awayTeam?.name ?? m.awayLabel ?? "Por definir",
                awayFlag: m.awayTeam?.flag ?? null,
                awayCode: m.awayTeam?.code ?? null,
                userBet: m.bets[0]?.pick ?? null,
                allowDraw: m.penaltiesAllowed,
              }))}
              teams={teams.map((t) => ({ code: t.code, name: t.name, flag: t.flag ?? null }))}
              savedTiebreaker={savedTb ? {
                topScorerTeam: savedTb.topScorerTeam,
                firstHalfGoals: savedTb.firstHalfGoals,
                earliestGoalTeam: savedTb.earliestGoalTeam,
              } : null}
            />
          )}
          {matches.length > 0 && <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Quiniela de jornada (bolsa) ────────────────────────────────
  const pool = GROUP_MATCH_QUINIELAS.find((q) => q.module === mod)!;
  const [matches, ranks, participants, winners] = await Promise.all([
    prisma.match.findMany({
      where: { stage: "GROUP", matchNumber: { gte: pool.min, lte: pool.max } },
      orderBy: { matchNumber: "asc" },
      include: {
        homeTeam: { select: { name: true, flag: true, code: true } },
        awayTeam: { select: { name: true, flag: true, code: true } },
        bets: { where: { userId, poolModule: mod }, select: { pick: true } },
      },
    }),
    getGroupQuinielaRanks(userId),
    getQuinielaLeaderboard(mod),
    getLastJornadaWinners(),
  ]);
  const winnerIds = [...winners];

  const lockMs = matches.length ? Math.min(...matches.map((m) => m.scheduledAt.getTime())) : 0;
  const lockDate = new Date(lockMs);

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <BackBar />
        {matches.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-10">Esta jornada aún no está disponible.</p>
        ) : (
          <QuinielaSection
            module={mod}
            label={pool.label}
            accent={MODULE_META[mod].accent}
            locked={isLocked(lockDate)}
            lockLabel={fmtLock(lockMs)}
            standing={ranks[mod] ?? null}
            access={{ price: access.price, paymentStatus: access.paymentStatus, entryOpen: access.entryOpen, entered: access.entered }}
            matches={matches.map((m) => ({
              id: m.id,
              matchNumber: m.matchNumber,
              homeName: m.homeTeam?.name ?? m.homeLabel ?? "Por definir",
              homeFlag: m.homeTeam?.flag ?? null,
              homeCode: m.homeTeam?.code ?? null,
              awayName: m.awayTeam?.name ?? m.awayLabel ?? "Por definir",
              awayFlag: m.awayTeam?.flag ?? null,
              awayCode: m.awayTeam?.code ?? null,
              userBet: m.bets[0]?.pick ?? null,
            }))}
          />
        )}
        {matches.length > 0 && <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />}
      </div>
      <BottomNav />
    </div>
  );
}
