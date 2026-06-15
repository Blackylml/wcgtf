import { prisma } from "@/lib/prisma";
import { Stage } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchRow } from "./MatchRow";
import { BulkActions } from "./BulkActions";
import { ResultSyncPanel } from "./ResultSyncPanel";

const STAGES: { key: Stage; label: string }[] = [
  { key: Stage.GROUP, label: "Grupos" },
  { key: Stage.R32, label: "R32" },
  { key: Stage.R16, label: "R16" },
  { key: Stage.QF, label: "Cuartos" },
  { key: Stage.SF, label: "Semis" },
  { key: Stage.THIRD, label: "3er lugar" },
  { key: Stage.FINAL, label: "Final" },
];

export default async function PartidosAdminPage() {
  const matches = await prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true, flag: true, code: true } },
      awayTeam: { select: { id: true, name: true, flag: true, code: true } },
    },
  });

  const byStage = new Map<Stage, typeof matches>();
  for (const stage of STAGES) {
    byStage.set(stage.key, matches.filter((m) => m.stage === stage.key));
  }

  const openCount = matches.filter((m) => m.isOpen).length;
  const resultCount = matches.filter((m) => m.homeScore !== null).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
        <div className="flex gap-3 text-sm text-gray-500">
          <span><Badge className="bg-green-100 text-green-800 mr-1">{openCount}</Badge> abiertos</span>
          <span><Badge variant="outline" className="mr-1">{resultCount}</Badge> con resultado</span>
        </div>
      </div>

      <ResultSyncPanel />

      <Tabs defaultValue="GROUP">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {STAGES.map((s) => {
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

        {STAGES.map((s) => {
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
