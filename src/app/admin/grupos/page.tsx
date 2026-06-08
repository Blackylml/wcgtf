import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const GROUP_NAMES = ["A","B","C","D","E","F","G","H","I","J","K","L"];

async function initGroups() {
  "use server";
  for (const name of GROUP_NAMES) {
    await prisma.groupPool.upsert({
      where: { name },
      update: {},
      create: { name, isOpen: false, price: 0 },
    });
  }
  revalidatePath("/admin/grupos");
}

async function toggleGroup(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isOpen") === "true";
  await prisma.groupPool.update({ where: { id }, data: { isOpen: !current } });
  revalidatePath("/admin/grupos");
}

async function toggleAll(formData: FormData) {
  "use server";
  const open = formData.get("open") === "true";
  await prisma.groupPool.updateMany({ data: { isOpen: open } });
  revalidatePath("/admin/grupos");
}

async function setPrice(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const price = parseFloat(formData.get("price") as string);
  if (isNaN(price) || price < 0) return;
  await prisma.groupPool.update({ where: { id }, data: { price } });
  revalidatePath("/admin/grupos");
}

async function setAllPrices(formData: FormData) {
  "use server";
  const price = parseFloat(formData.get("price") as string);
  if (isNaN(price) || price < 0) return;
  await prisma.groupPool.updateMany({ data: { price } });
  revalidatePath("/admin/grupos");
}

async function scoreGroupPositions(formData: FormData) {
  "use server";
  const groupPoolId = formData.get("groupPoolId") as string;
  const positions: { teamId: string; position: number }[] = [];
  for (let pos = 1; pos <= 4; pos++) {
    const teamId = formData.get(`pos_${pos}`) as string;
    if (teamId) positions.push({ teamId, position: pos });
  }
  if (positions.length !== 4) return;

  // Mark each GroupBet as correct if position matches, incorrect otherwise
  const bets = await prisma.groupBet.findMany({ where: { groupPoolId } });
  for (const bet of bets) {
    const actual = positions.find((p) => p.teamId === bet.teamId);
    await prisma.groupBet.update({
      where: { id: bet.id },
      data: { isCorrect: actual?.position === bet.position },
    });
  }
  revalidatePath("/admin/grupos");
  revalidatePath("/dashboard");
}

export default async function GruposAdminPage() {
  const groups = await prisma.groupPool.findMany({ orderBy: { name: "asc" } });
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, flag: true, group: true },
    orderBy: { name: "asc" },
  });

  const teamsByGroup: Record<string, number> = {};
  const teamListByGroup: Record<string, typeof teams> = {};
  for (const t of teams) {
    if (t.group) {
      teamsByGroup[t.group] = (teamsByGroup[t.group] ?? 0) + 1;
      if (!teamListByGroup[t.group]) teamListByGroup[t.group] = [];
      teamListByGroup[t.group].push(t);
    }
  }

  const openCount = groups.filter((g) => g.isOpen).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fase de Grupos</h1>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-4">Los grupos aún no han sido inicializados.</p>
            <form action={initGroups}>
              <Button type="submit">Inicializar 12 grupos</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones globales</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 items-end">
              <form action={toggleAll} className="flex gap-2">
                <input type="hidden" name="open" value="true" />
                <Button type="submit" variant="outline" size="sm" className="text-green-700 border-green-300">
                  Abrir todos
                </Button>
              </form>
              <form action={toggleAll} className="flex gap-2">
                <input type="hidden" name="open" value="false" />
                <Button type="submit" variant="outline" size="sm" className="text-red-700 border-red-300">
                  Cerrar todos
                </Button>
              </form>
              <form action={setAllPrices} className="flex items-center gap-2">
                <Input name="price" type="number" step="0.01" min="0" placeholder="Precio uniforme" className="w-36 h-8 text-sm" />
                <Button type="submit" size="sm" variant="outline">Aplicar a todos</Button>
              </form>
              <span className="text-sm text-gray-500 ml-auto">
                {openCount}/{groups.length} grupos abiertos
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Equipos</TableHead>
                    <TableHead>Precio (MXN)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">Grupo {g.name}</TableCell>
                      <TableCell>
                        <span className={`text-sm ${(teamsByGroup[g.name] ?? 0) < 4 ? "text-orange-500" : "text-gray-600"}`}>
                          {teamsByGroup[g.name] ?? 0}/4
                        </span>
                      </TableCell>
                      <TableCell>
                        <form action={setPrice} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={g.id} />
                          <Input
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={Number(g.price)}
                            className="w-24 h-7 text-sm"
                          />
                          <button type="submit" className="text-xs text-blue-600 hover:underline">
                            Guardar
                          </button>
                        </form>
                      </TableCell>
                      <TableCell>
                        <Badge className={g.isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {g.isOpen ? "Abierto" : "Cerrado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <form action={toggleGroup}>
                          <input type="hidden" name="id" value={g.id} />
                          <input type="hidden" name="isOpen" value={String(g.isOpen)} />
                          <button type="submit" className={`text-xs hover:underline ${g.isOpen ? "text-red-500" : "text-green-600"}`}>
                            {g.isOpen ? "Cerrar" : "Abrir"}
                          </button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Calificar posiciones finales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calificar posiciones finales</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Ingresa las posiciones reales de cada grupo para marcar las apuestas como correctas/incorrectas.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((g) => {
                  const groupTeams = teamListByGroup[g.name] ?? [];
                  return (
                    <form key={g.id} action={scoreGroupPositions}
                      className="border rounded p-3 space-y-2 text-sm">
                      <input type="hidden" name="groupPoolId" value={g.id} />
                      <p className="font-semibold text-xs text-gray-600 mb-1">Grupo {g.name}</p>
                      {[1, 2, 3, 4].map((pos) => (
                        <div key={pos} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5">{pos}°</span>
                          <select name={`pos_${pos}`}
                            className="flex-1 border rounded px-1 py-0.5 text-xs"
                            defaultValue="">
                            <option value="">— Equipo —</option>
                            {groupTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.flag} {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <Button type="submit" size="sm" variant="outline"
                        className="w-full h-7 text-xs mt-1">
                        Confirmar Grupo {g.name}
                      </Button>
                    </form>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
