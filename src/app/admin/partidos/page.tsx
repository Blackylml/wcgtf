import { prisma } from "@/lib/prisma";
import { Stage } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { MatchRow } from "./MatchRow";
import { BulkActions } from "./BulkActions";
import { ResultSyncPanel } from "./ResultSyncPanel";
import { LMX_JORNADAS, LMX_LIGUILLA } from "@/lib/modules";

const MUNDIAL_STAGES: { key: Stage; label: string }[] = [
  { key: Stage.GROUP, label: "Grupos" },
  { key: Stage.R32, label: "R32" },
  { key: Stage.R16, label: "R16" },
  { key: Stage.QF, label: "Cuartos" },
  { key: Stage.SF, label: "Semis" },
  { key: Stage.THIRD, label: "3er lugar" },
  { key: Stage.FINAL, label: "Final" },
];

const LMX_LIGUILLA_STAGE_MAP: Record<string, Stage> = {
  LMX_QF: Stage.LIG_QF,
  LMX_SF: Stage.LIG_SF,
  LMX_FINAL: Stage.LIG_FINAL,
};

export default async function PartidosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const isMundial = t === "mundial";

  // ── Carga de matches ─────────────────────────────────────────────────────────
  const lmxStages: Stage[] = [Stage.JORNADA, Stage.LIG_QF, Stage.LIG_SF, Stage.LIG_FINAL];
  const mundialStages = MUNDIAL_STAGES.map((s) => s.key);

  const matches = await prisma.match.findMany({
    where: { stage: { in: isMundial ? mundialStages : lmxStages } },
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true, flag: true, code: true } },
      awayTeam: { select: { id: true, name: true, flag: true, code: true } },
    },
  });

  const openCount = matches.filter((m) => m.isOpen).length;
  const resultCount = matches.filter((m) => m.homeScore !== null).length;

  const btnBase = "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";
  const btnActive = "bg-amber-400/10 text-amber-700 ring-1 ring-amber-400/30";
  const btnInactive = "text-gray-500 hover:bg-gray-100";

  // ── Vista Liga MX ────────────────────────────────────────────────────────────
  if (!isMundial) {
    // Agrupar JORNADA matches por jornada usando LMX_JORNADAS
    type LmxTab = {
      key: string;
      label: string;
      stage: Stage;
      tabMatches: typeof matches;
    };

    const tabs: LmxTab[] = [];

    for (const j of LMX_JORNADAS) {
      const jMatches = matches.filter(
        (m) => m.stage === Stage.JORNADA && m.matchNumber >= j.min && m.matchNumber <= j.max,
      );
      if (jMatches.length > 0) {
        tabs.push({ key: j.module, label: j.label, stage: Stage.JORNADA, tabMatches: jMatches });
      }
    }

    for (const lig of LMX_LIGUILLA) {
      const ligStage = LMX_LIGUILLA_STAGE_MAP[lig.module];
      const ligMatches = matches.filter((m) => m.stage === ligStage);
      if (ligMatches.length > 0) {
        tabs.push({ key: lig.module, label: lig.label, stage: ligStage, tabMatches: ligMatches });
      }
    }

    const defaultTab = tabs[0]?.key ?? "LMX_J1";

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <div className="flex gap-3 text-sm text-gray-500">
            <span><Badge className="bg-green-100 text-green-800 mr-1">{openCount}</Badge> abiertos</span>
            <span><Badge variant="outline" className="mr-1">{resultCount}</Badge> con resultado</span>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          <Link href="/admin/partidos" className={`${btnBase} ${btnActive}`}>Liga MX</Link>
          <Link href="/admin/partidos?t=mundial" className={`${btnBase} ${btnInactive}`}>Mundial 2026</Link>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {tabs.map((tab) => {
              const open = tab.tabMatches.filter((m) => m.isOpen).length;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                  {tab.label}
                  <span className="ml-1 text-gray-400">({open}/{tab.tabMatches.length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <BulkActions
                stage={tab.stage}
                label={tab.label}
                matchIds={tab.tabMatches.map((m) => m.id)}
              />
              <div className="space-y-2">
                {tab.tabMatches.map((m) => (
                  <MatchRow
                    key={`${m.id}:${m.homeScore}:${m.awayScore}:${m.penaltiesWinner}`}
                    match={{ ...m, price: Number(m.price) }}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // ── Vista Mundial ────────────────────────────────────────────────────────────
  const byStage = new Map<Stage, typeof matches>();
  for (const s of MUNDIAL_STAGES) {
    byStage.set(s.key, matches.filter((m) => m.stage === s.key));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        <div className="flex gap-3 text-sm text-gray-500">
          <span><Badge className="bg-green-100 text-green-800 mr-1">{openCount}</Badge> abiertos</span>
          <span><Badge variant="outline" className="mr-1">{resultCount}</Badge> con resultado</span>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <Link href="/admin/partidos" className={`${btnBase} ${btnInactive}`}>Liga MX</Link>
        <Link href="/admin/partidos?t=mundial" className={`${btnBase} ${btnActive}`}>Mundial 2026</Link>
      </div>

      <ResultSyncPanel />

      <Tabs defaultValue={MUNDIAL_STAGES[0].key}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {MUNDIAL_STAGES.map((s) => {
            const count = byStage.get(s.key)?.length ?? 0;
            const open = byStage.get(s.key)?.filter((m) => m.isOpen).length ?? 0;
            return (
              <TabsTrigger key={s.key} value={s.key} className="text-xs">
                {s.label}
                <span className="ml-1 text-gray-400">({open}/{count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {MUNDIAL_STAGES.map((s) => {
          const stageMatches = byStage.get(s.key) ?? [];
          return (
            <TabsContent key={s.key} value={s.key}>
              <BulkActions stage={s.key} label={s.label} />
              <div className="space-y-2">
                {stageMatches.map((m) => (
                  <MatchRow
                    key={`${m.id}:${m.homeScore}:${m.awayScore}:${m.penaltiesWinner}`}
                    match={{ ...m, price: Number(m.price) }}
                  />
                ))}
                {stageMatches.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin partidos en esta fase.</p>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
