import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { getModuleAccess, getLmxJornadaRanks, isLocked, type ModuleAccess, type QuinielaStanding } from "@/lib/module-access";
import { LMX_JORNADAS, LMX_LIGUILLA } from "@/lib/modules";
import { MatchCard } from "./MatchCard";
import { CalendarDays, ChevronRight, Trophy, Clock, Lock, ListChecks, Flame } from "lucide-react";
import Link from "next/link";

const ACCENT: Record<string, string> = {
  amber:  "bg-amber-400/10 ring-amber-400/30 text-amber-400 halo-gold",
  blue:   "bg-blue-400/10 ring-blue-400/30 text-blue-400 halo-blue",
  purple: "bg-purple-400/10 ring-purple-400/30 text-purple-400 halo-purple",
  green:  "bg-green-400/10 ring-green-400/30 text-green-400 halo-green",
};

function statusChip(access: ModuleAccess, locked: boolean) {
  if (locked) return { text: "Cerrada", cls: "text-slate-400 bg-white/[0.05] border-white/10" };
  if (access.price <= 0) return { text: "Gratis", cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" };
  if (access.approved) return { text: "Participando", cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" };
  if (access.paymentStatus === "PENDING") return { text: "Pendiente", cls: "text-slate-300 bg-white/[0.05] border-white/15" };
  return { text: `Pagar $${access.price}`, cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" };
}

type CardData = {
  href: string; label: string; accent: string; picks: number; total: number;
  access: ModuleAccess; locked: boolean; lockLabel: string; rank: QuinielaStanding | null;
  subtitle?: string; comingSoon?: boolean;
};

const fmtLock = (ms: number) =>
  new Date(ms).toLocaleString("es-MX", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Monterrey",
  });

function JornadaCard({ d, i }: { d: CardData; i: number }) {
  const chip = d.comingSoon
    ? { text: "Próximamente", cls: "text-slate-500 bg-white/[0.04] border-white/[0.08]" }
    : statusChip(d.access, d.locked);
  const a = ACCENT[d.accent] ?? ACCENT.amber;

  if (d.comingSoon) {
    return (
      <div
        style={{ animationDelay: `${i * 40}ms` }}
        className="animate-rise flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 opacity-40 cursor-not-allowed select-none"
      >
        <span className={`grid place-items-center w-11 h-11 rounded-2xl ring-1 shrink-0 ${a}`}>
          <CalendarDays size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-white leading-tight">{d.label}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Sin partidos todavía</p>
        </div>
        <span className={`shrink-0 text-[11px] font-semibold rounded-full border px-2.5 py-1 ${chip.cls}`}>{chip.text}</span>
      </div>
    );
  }

  return (
    <Link
      href={d.href}
      style={{ animationDelay: `${i * 40}ms` }}
      className="animate-rise flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 hover:bg-white/[0.04] hover:border-white/15 transition-all active:scale-[0.99]"
    >
      <span className={`grid place-items-center w-11 h-11 rounded-2xl ring-1 shrink-0 ${a}`}>
        <CalendarDays size={19} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-white leading-tight">{d.label}</p>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
          {d.subtitle ? (
            <span>{d.subtitle}</span>
          ) : (
            <>
              <span className="tabular-nums">{d.picks}/{d.total} pronósticos</span>
              {d.rank?.ranked ? (
                <span className="inline-flex items-center gap-1 text-amber-300"><Trophy size={10} /> #{d.rank.rank} de {d.rank.total}</span>
              ) : d.locked ? (
                <span className="inline-flex items-center gap-1 text-red-300/80"><Lock size={10} /> cerrada</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500"><Clock size={10} /> cierra {d.lockLabel}</span>
              )}
            </>
          )}
        </p>
      </div>
      <span className={`shrink-0 text-[11px] font-semibold rounded-full border px-2.5 py-1 ${chip.cls}`}>{chip.text}</span>
      <ChevronRight size={16} className="text-slate-600 shrink-0" />
    </Link>
  );
}

export default async function PartidosLobby() {
  const session = await auth();
  const userId = session!.user.id;

  // Todos los partidos Liga MX + partidos individuales con precio
  const [allMatches, featured] = await Promise.all([
    prisma.match.findMany({
      where: { stage: "JORNADA" },
      orderBy: { matchNumber: "asc" },
      select: {
        matchNumber: true, stage: true, scheduledAt: true, price: true,
        bets: { where: { userId }, select: { poolModule: true } },
      },
    }),
    prisma.match.findMany({
      where: { price: { gt: 0 } },
      orderBy: { scheduledAt: "asc" },
      include: {
        homeTeam: { select: { name: true, flag: true, code: true } },
        awayTeam: { select: { name: true, flag: true, code: true } },
        bets: { where: { userId, poolModule: null }, select: { pick: true, payment: { select: { status: true } } } },
      },
    }),
  ]);

  // Ranks del usuario en cada jornada
  const ranks = await getLmxJornadaRanks(userId);

  // Acceso por módulo — solo para jornadas con partidos en DB
  const jornadasConPartidos = LMX_JORNADAS.filter((q) =>
    allMatches.some((m) => m.matchNumber >= q.min && m.matchNumber <= q.max)
  );
  const accessResults = await Promise.all(
    jornadasConPartidos.map((q) => getModuleAccess(userId, q.module))
  );
  const accessByModule: Record<string, ModuleAccess> = {};
  jornadasConPartidos.forEach((q, i) => { accessByModule[q.module] = accessResults[i]; });

  // Construir tarjetas de jornadas
  const jornadaCards: CardData[] = LMX_JORNADAS.map((q) => {
    // Partidos que pertenecen a esta jornada (respetando exclude y extra)
    const qm = allMatches.filter((m) => {
      const inRange = m.matchNumber >= q.min && m.matchNumber <= q.max && !(q.exclude?.includes(m.matchNumber));
      const isExtra = q.extra?.includes(m.matchNumber) ?? false;
      return inRange || isExtra;
    });
    if (qm.length === 0) {
      return {
        href: `/partidos/${q.module}`, label: q.label, accent: "amber",
        picks: 0, total: 0,
        access: { price: 0, entryOpen: false, paymentStatus: null, entered: false, approved: false, duelEntered: false },
        locked: false, lockLabel: "", rank: null, comingSoon: true,
      };
    }
    const lockMs = Math.min(...qm.map((m) => m.scheduledAt.getTime()));
    const acc = accessByModule[q.module];
    // Solo mostrar picks si el usuario pagó la quiniela (no por duelo)
    const picks = acc?.entered
      ? qm.filter((m) => m.bets.some((b) => b.poolModule === q.module)).length
      : 0;
    return {
      href: `/partidos/${q.module}`,
      label: q.label,
      accent: "amber",
      picks,
      total: qm.length,
      access: acc,
      locked: isLocked(new Date(lockMs)),
      lockLabel: fmtLock(lockMs),
      rank: ranks[q.module] ?? null,
    };
  });

  // Tarjetas de Liguilla (siempre "próximamente" hasta activar)
  const liguillaCards: CardData[] = LMX_LIGUILLA.map((q) => ({
    href: `/partidos/${q.module}`,
    label: q.label,
    accent: "amber",
    picks: 0, total: 0,
    access: { price: 0, entryOpen: false, paymentStatus: null, entered: false, approved: false, duelEntered: false },
    locked: false, lockLabel: "", rank: null,
    comingSoon: !q.available,
  }));

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          icon={CalendarDays}
          accent="amber"
          title="Jornadas"
          subtitle="Elige una jornada y llena tus pronósticos."
          right={
            <Link
              href="/resultados"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 border border-white/12 bg-white/[0.03] rounded-full px-3 py-2 hover:bg-white/[0.07] transition-colors"
            >
              <ListChecks size={14} className="text-amber-400" /> Resultados
            </Link>
          }
        />

        {/* Partidos con precio individual */}
        {featured.length > 0 && (
          <section className="mb-6">
            <h2 className="animate-rise flex items-center gap-2 font-display text-sm font-bold text-amber-300 mb-2.5">
              <Flame size={16} /> Partidos destacados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featured.map((m, i) => (
                <div key={m.id} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <MatchCard match={{
                    id: m.id, matchNumber: m.matchNumber, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                    homeLabel: m.homeLabel, awayLabel: m.awayLabel, stage: m.stage,
                    scheduledAt: m.scheduledAt, venue: m.venue, isOpen: m.isOpen,
                    price: Number(m.price), penaltiesAllowed: m.penaltiesAllowed,
                    userBet: m.bets[0]?.pick ?? null,
                    paymentStatus: m.bets[0]?.payment?.status ?? null,
                    enabled: true, featured: true,
                  }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Jornadas regulares */}
        <h2 className="font-display text-sm font-bold text-slate-300 mb-2.5">Jornada regular</h2>
        <div className="space-y-2.5 mb-6">
          {jornadaCards.map((d, i) => <JornadaCard key={d.href} d={d} i={i} />)}
        </div>

        {/* Liguilla */}
        <h2 className="font-display text-sm font-bold text-slate-300 mb-2.5">Liguilla</h2>
        <div className="space-y-2.5">
          {liguillaCards.map((d, i) => <JornadaCard key={d.href} d={d} i={jornadaCards.length + i} />)}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
