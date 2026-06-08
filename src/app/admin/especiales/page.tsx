import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SpecialCategory } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABELS: Record<SpecialCategory, string> = {
  TOP_SCORER: "🥇 Goleador",
  BEST_PLAYER: "🌟 Jugador del Torneo",
  BEST_GOALKEEPER: "🧤 Mejor Portero",
  BEST_YOUNG_PLAYER: "🌱 Mejor Jugador Joven",
};

async function togglePool(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isOpen") === "true";
  await prisma.specialPool.update({ where: { id }, data: { isOpen: !current } });
  revalidatePath("/admin/especiales");
}

async function setPoolPrice(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const price = parseFloat(formData.get("price") as string);
  if (isNaN(price) || price < 0) return;
  await prisma.specialPool.update({ where: { id }, data: { price } });
  revalidatePath("/admin/especiales");
}

async function setWinner(formData: FormData) {
  "use server";
  const poolId = formData.get("poolId") as string;
  const playerId = formData.get("playerId") as string;
  const category = formData.get("category") as SpecialCategory;
  if (!playerId) return;

  await prisma.specialPool.update({ where: { id: poolId }, data: { winnerId: playerId } });

  // Marcar apuestas correctas/incorrectas
  await prisma.specialBet.updateMany({
    where: { category, playerId },
    data: { isCorrect: true },
  });
  await prisma.specialBet.updateMany({
    where: { category, NOT: { playerId } },
    data: { isCorrect: false },
  });

  revalidatePath("/admin/especiales");
}

async function clearWinner(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const category = formData.get("category") as SpecialCategory;
  await prisma.specialPool.update({ where: { id }, data: { winnerId: null } });
  await prisma.specialBet.updateMany({ where: { category }, data: { isCorrect: null } });
  revalidatePath("/admin/especiales");
}

export default async function EspecialesAdminPage() {
  const pools = await prisma.specialPool.findMany({ include: { winner: { include: { team: true } } } });
  const players = await prisma.player.findMany({
    include: { team: { select: { name: true, flag: true, code: true } } },
    orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
  });

  const betCounts = await prisma.specialBet.groupBy({
    by: ["category"],
    _count: true,
  });
  const betMap = new Map(betCounts.map((b) => [b.category, b._count]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Premios Especiales</h1>
      <div className="space-y-4">
        {(Object.keys(LABELS) as SpecialCategory[]).map((cat) => {
          const pool = pools.find((p) => p.category === cat);
          if (!pool) return null;
          const bets = betMap.get(cat) ?? 0;

          return (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{LABELS[cat]}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={pool.isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                      {pool.isOpen ? "Abierto" : "Cerrado"}
                    </Badge>
                    <span className="text-xs text-gray-500">{bets} apuestas</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Precio */}
                  <form action={setPoolPrice} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={pool.id} />
                    <label className="text-sm text-gray-600">Precio (MXN)</label>
                    <Input name="price" type="number" min="0" step="0.01"
                      defaultValue={Number(pool.price)} className="w-28 h-8 text-sm" />
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Guardar</Button>
                  </form>

                  {/* Abrir/Cerrar */}
                  <form action={togglePool}>
                    <input type="hidden" name="id" value={pool.id} />
                    <input type="hidden" name="isOpen" value={String(pool.isOpen)} />
                    <Button type="submit" size="sm" variant="outline"
                      className={`h-8 text-xs ${pool.isOpen ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}`}>
                      {pool.isOpen ? "Cerrar apuestas" : "Abrir apuestas"}
                    </Button>
                  </form>

                  {/* Ganador */}
                  {pool.winner ? (
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-sm">
                        <span className="text-gray-500 mr-1">Ganador:</span>
                        <span className="font-semibold">
                          {pool.winner.team.flag} {pool.winner.name}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">({pool.winner.team.name})</span>
                      </div>
                      <form action={clearWinner}>
                        <input type="hidden" name="id" value={pool.id} />
                        <input type="hidden" name="category" value={cat} />
                        <button type="submit" className="text-xs text-red-500 hover:underline">Limpiar</button>
                      </form>
                    </div>
                  ) : (
                    <form action={setWinner} className="flex items-center gap-2 ml-auto">
                      <input type="hidden" name="poolId" value={pool.id} />
                      <input type="hidden" name="category" value={cat} />
                      <select name="playerId" className="border rounded px-2 py-1 text-sm h-8 max-w-xs">
                        <option value="">— Seleccionar ganador —</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.team.flag} {p.name} ({p.team.name})
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" className="h-8 text-xs bg-green-700 hover:bg-green-800">
                        Confirmar
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
