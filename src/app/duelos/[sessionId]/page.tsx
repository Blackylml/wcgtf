import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { LMX_JORNADAS } from "@/lib/modules";
import { moduleLockAt, isLocked } from "@/lib/module-access";
import { resolveFinishedDuels } from "@/lib/duel-auto-pair";
import { DuelPicksForm } from "./DuelPicksForm";
import { DuelMatchup, type MatchupRow } from "./DuelMatchup";
import { ArrowLeft, Swords, Clock } from "lucide-react";
import Link from "next/link";
import { MatchPick } from "@/generated/prisma/client";

const fmtLock = (d: Date) =>
  d.toLocaleString("es-MX", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Monterrey",
  });

function Avatar({ name, image, size = 48 }: { name: string; image: string | null; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.34 };
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        style={style}
        className="rounded-full object-cover ring-2 ring-white/15 shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      style={style}
      className="rounded-full bg-white/[0.08] ring-2 ring-white/15 grid place-items-center font-bold text-slate-300 shrink-0"
    >
      {initials || "?"}
    </span>
  );
}

export default async function DuelSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");
  const userId = authSession.user.id;

  await resolveFinishedDuels();

  const duelSession = await prisma.duelSession.findUnique({
    where: { id: sessionId },
    include: {
      entries: { where: { userId }, select: { id: true, paired: true, refunded: true, goalsGuess: true } },
      pairs: {
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          user1: { select: { id: true, name: true, image: true, email: true } },
          user2: { select: { id: true, name: true, image: true, email: true } },
          winner: { select: { id: true } },
        },
      },
    },
  });
  if (!duelSession) notFound();

  const entry = duelSession.entries[0] ?? null;
  if (!entry) redirect("/duelos");

  const pair = duelSession.pairs[0] ?? null;
  const iAmUser1 = pair?.user1Id === userId;
  const rival = pair ? (iAmUser1 ? pair.user2 : pair.user1) : null;
  const myScore = pair ? (iAmUser1 ? pair.score1 : pair.score2) : null;
  const rivalScore = pair ? (iAmUser1 ? pair.score2 : pair.score1) : null;
  const winnerId = pair?.winner?.id ?? null;
  const prize = Number(duelSession.entryFee) * 2 * (1 - duelSession.houseCutPct / 100);

  const jornada = LMX_JORNADAS.find((j) => j.module === duelSession.module);

  const allMatches = await prisma.match.findMany({
    where: { stage: "JORNADA" },
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: { select: { name: true, flag: true, code: true } },
      awayTeam: { select: { name: true, flag: true, code: true } },
      bets: { where: { userId, duelSessionId: sessionId }, select: { pick: true, isCorrect: true } },
    },
  });

  const matches = jornada
    ? allMatches.filter((m) => {
        const inRange =
          m.matchNumber >= jornada.min &&
          m.matchNumber <= jornada.max &&
          !(jornada.exclude?.includes(m.matchNumber));
        const isExtra = jornada.extra?.includes(m.matchNumber) ?? false;
        return inRange || isExtra;
      })
    : allMatches;

  // Picks + goalsGuess del rival
  const [rivalBetsList, rivalEntry] = await Promise.all([
    rival
      ? prisma.matchBet.findMany({
          where: { userId: rival.id, duelSessionId: sessionId },
          select: { matchId: true, pick: true, isCorrect: true },
        })
      : Promise.resolve([]),
    rival
      ? prisma.duelEntry.findUnique({
          where: { sessionId_userId: { sessionId, userId: rival.id } },
          select: { goalsGuess: true },
        })
      : Promise.resolve(null),
  ]);
  const rivalBetsMap = new Map(rivalBetsList.map((b) => [b.matchId, b]));

  const lockAt = await moduleLockAt(duelSession.module);
  const locked = isLocked(lockAt);
  const lockLabel = lockAt ? fmtLock(lockAt) : "";

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">

        {/* Back */}
        <Link
          href="/duelos"
          className="animate-rise inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Todos los duelos
        </Link>

        {/* Session header */}
        <div className="animate-rise flex items-center gap-3 mb-6">
          <span className="grid place-items-center w-11 h-11 rounded-2xl ring-1 bg-red-400/10 ring-red-400/30 text-red-400 shrink-0">
            <Swords size={19} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight">{duelSession.label}</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Duelo 1v1 · Premio: ${prize.toFixed(0)} créditos
            </p>
          </div>
        </div>

        {/* Status card */}
        {entry.refunded ? (
          <div className="animate-rise mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
            <p className="text-sm text-slate-400">Reembolsado — quedaste sin pareja.</p>
            <p className="text-xs text-amber-400 mt-1">
              ${Number(duelSession.entryFee).toFixed(0)} créditos devueltos.
            </p>
          </div>
        ) : pair && rival ? (
          <div className="animate-rise mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3 py-2">
              {/* Me */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <Avatar
                  name={authSession.user.name ?? "Tú"}
                  image={authSession.user.image ?? null}
                  size={52}
                />
                <span className="text-xs font-bold text-amber-400">Tú</span>
                {myScore != null && (
                  <span
                    className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
                      winnerId === userId ? "text-green-400" : "text-white"
                    }`}
                  >
                    {myScore}
                  </span>
                )}
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Swords size={22} className="text-red-400 opacity-60" />
                <span className="text-[9px] font-bold text-slate-600 tracking-[0.18em]">VS</span>
              </div>

              {/* Rival */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <Avatar
                  name={rival.name ?? rival.email ?? "Rival"}
                  image={rival.image ?? null}
                  size={52}
                />
                <span className="text-xs font-medium text-slate-300 truncate max-w-[80px] text-center">
                  {(rival.name ?? rival.email ?? "Rival").split(" ")[0]}
                </span>
                {rivalScore != null && (
                  <span
                    className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
                      winnerId === rival.id ? "text-red-400" : "text-white"
                    }`}
                  >
                    {rivalScore}
                  </span>
                )}
              </div>
            </div>

            {/* Status pill */}
            <div
              className={`mt-3 rounded-xl px-4 py-2.5 text-center text-xs font-semibold ${
                winnerId === userId
                  ? "bg-green-400/10 text-green-400 border border-green-400/20"
                  : winnerId != null && winnerId !== userId
                    ? "bg-red-400/[0.08] text-red-400 border border-red-400/20"
                    : myScore != null && rivalScore != null && winnerId == null
                      ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                      : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
              }`}
            >
              {winnerId === userId
                ? `🏆 Ganaste · +$${prize.toFixed(0)} créditos`
                : winnerId != null && winnerId !== userId
                  ? "Ganó el rival · Suerte la próxima"
                  : myScore != null && rivalScore != null && winnerId == null
                    ? `⚖ Empate · +$${(prize / 2).toFixed(0)} créditos devueltos`
                    : `Premio: $${prize.toFixed(0)} · En juego`}
            </div>
          </div>
        ) : (
          <div className="animate-rise mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center gap-3">
              <Clock size={15} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Inscrito · Esperando emparejamiento</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  La ruleta asigna tu rival al iniciar el primer partido
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Head-to-head matchup (solo cuando hay rival) */}
        {rival && (
          <DuelMatchup
            myName={authSession.user.name ?? "Tú"}
            myImage={authSession.user.image ?? null}
            rivalName={rival.name ?? rival.email ?? "Rival"}
            rivalImage={rival.image ?? null}
            myGoalsGuess={entry?.goalsGuess ?? null}
            rivalGoalsGuess={rivalEntry?.goalsGuess ?? null}
            rows={matches.map((m): MatchupRow => ({
              id: m.id,
              matchNumber: m.matchNumber,
              homeName: m.homeTeam?.name ?? m.homeLabel ?? "Local",
              homeFlag: m.homeTeam?.flag ?? null,
              awayName: m.awayTeam?.name ?? m.awayLabel ?? "Visitante",
              awayFlag: m.awayTeam?.flag ?? null,
              homeScore: m.homeScore ?? null,
              awayScore: m.awayScore ?? null,
              myBet: m.bets[0] ? { pick: m.bets[0].pick, isCorrect: m.bets[0].isCorrect ?? null } : null,
              rivalBet: rivalBetsMap.has(m.id)
                ? { pick: rivalBetsMap.get(m.id)!.pick, isCorrect: rivalBetsMap.get(m.id)!.isCorrect ?? null }
                : null,
            }))}
          />
        )}

        {/* Picks form */}
        <DuelPicksForm
          sessionId={sessionId}
          matches={matches.map((m) => ({
            id: m.id,
            matchNumber: m.matchNumber,
            homeName: m.homeTeam?.name ?? m.homeLabel ?? "Local",
            homeFlag: m.homeTeam?.flag ?? null,
            homeCode: m.homeTeam?.code ?? null,
            awayName: m.awayTeam?.name ?? m.awayLabel ?? "Visitante",
            awayFlag: m.awayTeam?.flag ?? null,
            awayCode: m.awayTeam?.code ?? null,
            userBet: (m.bets[0]?.pick ?? null) as MatchPick | null,
          }))}
          locked={locked}
          lockLabel={lockLabel}
          initialGoalsGuess={entry?.goalsGuess ?? null}
        />


      </div>
      <BottomNav />
    </div>
  );
}
