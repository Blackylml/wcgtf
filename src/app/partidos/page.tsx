import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { getModuleAccess, getGroupQuinielaRanks, isLocked, type ModuleAccess, type QuinielaStanding } from "@/lib/module-access";
import { GROUP_MATCH_QUINIELAS } from "@/lib/modules";
import { MatchCard } from "./MatchCard";
import { CalendarDays, ChevronRight, Trophy, Clock, Lock, ListChecks, Flame } from "lucide-react";
import Link from "next/link";

const ACCENT: Record<string, string> = {
  blue: "bg-blue-400/10 ring-blue-400/30 text-blue-400 halo-blue",
  purple: "bg-purple-400/10 ring-purple-400/30 text-purple-400 halo-purple",
  amber: "bg-amber-400/10 ring-amber-400/30 text-amber-400 halo-amber",
};

function statusChip(access: ModuleAccess, locked: boolean) {
  if (locked) return { text: "Cerrada", cls: "text-slate-400 bg-white/[0.05] border-white/10" };
  if (access.price <= 0) return { text: "Gratis", cls: "text-green-300 bg-green-400/10 border-green-400/25" };
  if (access.approved) return { text: "Participando", cls: "text-green-300 bg-green-400/10 border-green-400/25" };
  if (access.paymentStatus === "PENDING") return { text: "Pendiente", cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" };
  return { text: `Pagar $${access.price}`, cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" };
}

type CardData = {
  href: string; label: string; accent: string; picks: number; total: number;
  access: ModuleAccess; locked: boolean; lockLabel: string; rank: QuinielaStanding | null;
  subtitle?: string;
};

function QuinielaCard({ d, i }: { d: CardData; i: number }) {
  const chip = statusChip(d.access, d.locked);
  const a = ACCENT[d.accent] ?? ACCENT.blue;
  return (
    <Link
      href={d.href}
      style={{ animationDelay: `${i * 50}ms` }}
      className="animate-rise flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 hover:bg-white/[0.04] hover:border-white/15 transition-all active:scale-[0.99]"
    >
      <span className={`grid place-items-center w-11 h-11 rounded-2xl ring-1 shrink-0 ${a}`}>
        <Trophy size={20} strokeWidth={2} />
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

const fmtLock = (ms: number) =>
  new Date(ms).toLocaleString("es-MX", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Monterrey" });

export default async function PartidosLobby() {
  const session = await auth();
  const userId = session!.user.id;

  const [matches, featured] = await Promise.all([
    prisma.match.findMany({
      orderBy: { matchNumber: "asc" },
      select: { matchNumber: true, stage: true, scheduledAt: true, price: true, bets: { where: { userId }, select: { poolModule: true } } },
    }),
    // Partidos destacados = apuestas individuales (precio propio), abiertos para apostar.
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

  const [g1, g2, g2b, g3, mk, bracket, ranks] = await Promise.all([
    getModuleAccess(userId, "MATCHES_G1"),
    getModuleAccess(userId, "MATCHES_G2"),
    getModuleAccess(userId, "MATCHES_G2B"),
    getModuleAccess(userId, "MATCHES_G3"),
    getModuleAccess(userId, "MATCHES"),
    getModuleAccess(userId, "BRACKET"),
    getGroupQuinielaRanks(userId),
  ]);
  const accessByModule: Record<string, ModuleAccess> = { MATCHES_G1: g1, MATCHES_G2: g2, MATCHES_G2B: g2b, MATCHES_G3: g3, MATCHES: mk };

  const cards: CardData[] = [];

  for (const q of GROUP_MATCH_QUINIELAS) {
    const qm = matches.filter((m) => m.stage === "GROUP" && m.matchNumber >= q.min && m.matchNumber <= q.max);
    if (qm.length === 0) continue;
    const lockMs = Math.min(...qm.map((m) => m.scheduledAt.getTime()));
    cards.push({
      href: `/partidos/${q.module}`,
      label: q.label,
      accent: q.module === "MATCHES_G2B" ? "purple" : "blue",
      picks: qm.filter((m) => m.bets.some((b) => b.poolModule === q.module)).length,
      total: qm.length,
      access: accessByModule[q.module],
      locked: isLocked(new Date(lockMs)),
      lockLabel: fmtLock(lockMs),
      rank: ranks[q.module] ?? null,
    });
  }

  // Bracket — reemplaza temporalmente la card de Eliminatorias
  cards.push({
    href: "/bracket",
    label: "Bracket Eliminatorias",
    accent: "amber",
    picks: 0,
    total: 0,
    access: bracket,
    locked: false,
    lockLabel: "",
    rank: null,
    subtitle: "Predice el camino al título desde Dieciseisavos hasta el Campeón",
  });

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle
          icon={CalendarDays}
          accent="blue"
          title="Quinielas"
          subtitle="Elige una quiniela para llenar tus pronósticos."
          right={
            <Link href="/resultados" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 border border-white/12 bg-white/[0.03] rounded-full px-3 py-2 hover:bg-white/[0.07] transition-colors">
              <ListChecks size={14} className="text-blue-400" /> Resultados
            </Link>
          }
        />

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
                    homeLabel: m.homeLabel, awayLabel: m.awayLabel, stage: m.stage, scheduledAt: m.scheduledAt,
                    venue: m.venue, isOpen: m.isOpen, price: Number(m.price), penaltiesAllowed: m.penaltiesAllowed,
                    userBet: m.bets[0]?.pick ?? null, paymentStatus: m.bets[0]?.payment?.status ?? null,
                    enabled: true, featured: true,
                  }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {cards.length > 0 && (
          <h2 className="font-display text-sm font-bold text-slate-300 mb-2.5">Quinielas por jornada</h2>
        )}
        <div className="space-y-3">
          {cards.map((d, i) => <QuinielaCard key={d.href} d={d} i={i} />)}
          {cards.length === 0 && featured.length === 0 && <p className="text-slate-600 text-sm text-center py-10">Aún no hay quinielas disponibles.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
