import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageTitle } from "@/components/PageTitle";
import { ModuleEntryGate } from "@/components/ModuleEntryGate";
import { Leaderboard } from "@/components/Leaderboard";
import { getModuleAccess, getQuinielaLeaderboard, getLastJornadaWinners } from "@/lib/module-access";
import { MODULE_META } from "@/lib/modules";
import { BracketForm } from "./BracketForm";
import { BracketCancel } from "./BracketBetStatus";
import { Trophy, Lock } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  R32: "R32", R16: "R16", QF: "Cuartos", SF: "Semis", THIRD: "3er lugar", FINAL: "Final",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}

export default async function BracketPage() {
  const session = await auth();
  const userId = session!.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  const [userBet, access] = await Promise.all([
    bracketSession
      ? prisma.bracketBet.findUnique({
          where: { userId_bracketSessionId: { userId, bracketSessionId: bracketSession.id } },
        })
      : Promise.resolve(null),
    getModuleAccess(userId, "BRACKET"),
  ]);
  const participants = await getQuinielaLeaderboard("BRACKET");
  const winnerIds = [...(await getLastJornadaWinners())];

  const gate = (
    <ModuleEntryGate
      module="BRACKET"
      label={MODULE_META.BRACKET.label}
      accent={MODULE_META.BRACKET.accent}
      price={access.price}
      paymentStatus={access.paymentStatus}
      entryOpen={access.entryOpen}
    />
  );

  // Bracket todavía no abierto: mostrar preview + gate para pre-venta de cupos
  if (!bracketSession?.isOpen && !userBet) {
    return (
      <Shell>
        <PageTitle
          icon={Trophy}
          accent="amber"
          title="Bracket"
          subtitle="Predice el camino al título desde los Octavos de Final hasta la Gran Final."
        />
        {gate}
        <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/20 mb-4 mx-auto">
            <Trophy size={28} className="text-amber-400" strokeWidth={1.4} />
          </span>
          <p className="text-sm font-semibold text-white mb-1">Próximamente</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            El bracket se abrirá una vez que terminen los grupos y se conozcan las 32 llaves. ¡Asegura tu lugar ahora!
          </p>
        </div>
        <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />
      </Shell>
    );
  }

  if (userBet) {
    const predictions = userBet.predictions as Record<string, Record<string, string> | string>;
    const teams = await prisma.team.findMany({ select: { code: true, name: true, flag: true } });
    const teamMap = new Map(teams.map((t) => [t.code, t]));

    return (
      <Shell>
        <PageTitle
          icon={Trophy}
          accent="amber"
          title="Bracket"
          subtitle="Tu bracket enviado. Suma puntos por cada acierto en la cascada."
          right={
            <span className="inline-flex items-center text-sm font-bold bg-amber-400/10 border border-amber-400/25 text-amber-300 px-3 py-1.5 rounded-full">
              {userBet.score} pts
            </span>
          }
        />

        {gate}

        <div className="space-y-3">
          {(["R32", "R16", "QF", "SF"] as const).map((stage) => {
            const stagePreds = predictions[stage] as Record<string, string> | undefined;
            if (!stagePreds || !Object.keys(stagePreds).length) return null;
            return (
              <div key={stage} className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-[0.16em] font-semibold mb-3">{STAGE_LABELS[stage]}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(stagePreds).map(([slot, code]) => {
                    const t = teamMap.get(code);
                    return (
                      <div key={slot} className="text-xs flex items-center gap-1.5">
                        <span className="text-slate-600 w-4 shrink-0">{Number(slot) + 1}.</span>
                        <span className="text-slate-200 truncate">{t?.flag} {t?.name ?? code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 space-y-2.5">
            {predictions.THIRD && typeof predictions.THIRD === "string" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tercer lugar</span>
                <span className="text-white font-medium">
                  {teamMap.get(predictions.THIRD)?.flag} {teamMap.get(predictions.THIRD)?.name ?? predictions.THIRD}
                </span>
              </div>
            )}
            {predictions.FINAL && typeof predictions.FINAL === "string" && (
              <div className="flex items-center justify-between text-sm pt-2.5 border-t border-white/[0.06]">
                <span className="text-slate-500 flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> Campeón</span>
                <span className="font-bold text-amber-300">
                  {teamMap.get(predictions.FINAL)?.flag} {teamMap.get(predictions.FINAL)?.name ?? predictions.FINAL}
                </span>
              </div>
            )}
          </div>

          {bracketSession?.isOpen && <BracketCancel />}
        </div>

        <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />
      </Shell>
    );
  }

  const config = bracketSession!.config as { R32: [string, string][] } | null;
  const teams = await prisma.team.findMany({
    select: { code: true, name: true, flag: true },
    orderBy: { name: "asc" },
  });

  if (!config?.R32?.length) {
    return (
      <Shell>
        <div className="animate-rise py-16 text-center">
          <h1 className="font-display text-2xl font-extrabold mb-2">Bracket Eliminatorias</h1>
          <p className="text-slate-400 text-sm">El admin aún no ha configurado las llaves.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageTitle
        icon={Trophy}
        accent="amber"
        title="Bracket"
        subtitle="Elige el ganador de cada partido en cascada hasta el campeón."
      />
      {gate}
      {access.entered ? (
        <BracketForm config={config} teams={teams} />
      ) : (
        <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center">
          <Lock size={22} className="mx-auto text-slate-500 mb-2" />
          <p className="text-sm text-slate-400">Paga la entrada para llenar tu bracket.</p>
        </div>
      )}

      <Leaderboard rows={participants} currentUserId={userId} winnerIds={winnerIds} />
    </Shell>
  );
}
