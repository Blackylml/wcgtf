import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { FlagCircle } from "@/components/FlagCircle";
import { Stage } from "@/generated/prisma/client";
import { Clock, ListChecks } from "lucide-react";

const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Fase de Grupos", R32: "Ronda de 32", R16: "Ronda de 16", QF: "Cuartos",
  SF: "Semifinales", THIRD: "Tercer lugar", FINAL: "Final",
  JORNADA: "Jornada Liga MX", LIG_QF: "Liguilla — Cuartos", LIG_SF: "Liguilla — Semis", LIG_FINAL: "Liguilla — Final",
};
const STAGE_ORDER: Stage[] = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL", "JORNADA", "LIG_QF", "LIG_SF", "LIG_FINAL"];

export default async function ResultadosPage() {
  await auth();
  const matches = await prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: { select: { name: true, flag: true, code: true } },
      awayTeam: { select: { name: true, flag: true, code: true } },
    },
  });

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        <PageTitle icon={ListChecks} accent="blue" title="Resultados" subtitle="Marcadores y calendario de todos los partidos." />

        {STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s)).map((stage) => {
          const list = matches.filter((m) => m.stage === stage);
          return (
            <section key={stage} className="animate-rise mb-5">
              <h2 className="font-display text-sm font-bold text-slate-300 mb-2">{STAGE_LABELS[stage]}</h2>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] divide-y divide-white/[0.05] overflow-hidden">
                {list.map((m) => {
                  const home = m.homeTeam?.name ?? m.homeLabel ?? "Por definir";
                  const away = m.awayTeam?.name ?? m.awayLabel ?? "Por definir";
                  const played = m.homeScore !== null && m.awayScore !== null;
                  const d = new Date(m.scheduledAt);
                  const when = d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Monterrey" });
                  return (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                      <span className="font-mono text-[10px] text-slate-600 w-5 shrink-0">{m.matchNumber}</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-xs text-slate-200 truncate text-right">{home}</span>
                        <FlagCircle flag={m.homeTeam?.flag} code={m.homeTeam?.code} size={20} />
                      </div>
                      <div className="shrink-0 w-16 text-center">
                        {played ? (
                          <span className="font-mono font-bold text-sm text-white tabular-nums">{m.homeScore}–{m.awayScore}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Clock size={9} /> {when}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <FlagCircle flag={m.awayTeam?.flag} code={m.awayTeam?.code} size={20} />
                        <span className="text-xs text-slate-200 truncate">{away}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {matches.length === 0 && <p className="text-slate-600 text-sm text-center py-10">Aún no hay partidos cargados.</p>}
      </div>
      <BottomNav />
    </div>
  );
}
