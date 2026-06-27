import { prisma } from "@/lib/prisma";
import { KO_QUINIELAS } from "@/lib/modules";
import { KoResultadosClient } from "./KoResultadosClient";

export default async function KoResultadosPage() {
  const existing = await prisma.koRoundResult.findMany();
  const byModule = Object.fromEntries(existing.map((r) => [r.module, r]));

  const initialData = KO_QUINIELAS.filter((q) => q.available).map((koQ) => ({
    module: koQ.module,
    label: koQ.label,
    topScorerTeam: byModule[koQ.module]?.topScorerTeam ?? null,
    firstHalfGoals: byModule[koQ.module]?.firstHalfGoals ?? null,
    earliestGoalTeam: byModule[koQ.module]?.earliestGoalTeam ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resultados de desempate KO</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ingresa los valores reales al terminar cada ronda. Se usan para desempatar participantes con los mismos aciertos.
        </p>
      </div>
      <KoResultadosClient initialData={initialData} />
    </div>
  );
}
