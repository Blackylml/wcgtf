import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

async function createTeam(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const flag = formData.get("flag") as string;
  const group = formData.get("group") as string;
  if (!name || !code) return;
  await prisma.team.create({ data: { name, code: code.toUpperCase(), flag, group } });
  revalidatePath("/admin/equipos");
}

async function deleteTeam(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin/equipos");
}

export default async function EquiposPage() {
  const teams = await prisma.team.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });

  const byGroup: Record<string, typeof teams> = {};
  for (const t of teams) {
    const g = t.group ?? "Sin grupo";
    byGroup[g] = [...(byGroup[g] ?? []), t];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Equipos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Agregar equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeam} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" placeholder="México" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">Código (3 letras)</Label>
                <Input id="code" name="code" placeholder="MEX" maxLength={3} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="flag">Bandera (emoji o URL)</Label>
                <Input id="flag" name="flag" placeholder="🇲🇽" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="group">Grupo</Label>
                <select
                  name="group"
                  id="group"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>Grupo {g}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">Agregar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Equipos registrados ({teams.length}/48)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No hay equipos todavía. Agrega los 48 equipos del Mundial 2026.
              </p>
            ) : (
              <div className="space-y-4">
                {GROUPS.filter((g) => byGroup[g]).map((g) => (
                  <div key={g}>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Grupo {g}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bandera</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byGroup[g].map((team) => (
                          <TableRow key={team.id}>
                            <TableCell className="text-xl">{team.flag}</TableCell>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{team.code}</Badge>
                            </TableCell>
                            <TableCell>
                              <form action={deleteTeam}>
                                <input type="hidden" name="id" value={team.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </form>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {byGroup["Sin grupo"] && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sin grupo</p>
                    <Table>
                      <TableBody>
                        {byGroup["Sin grupo"].map((team) => (
                          <TableRow key={team.id}>
                            <TableCell className="text-xl">{team.flag}</TableCell>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell><Badge variant="outline">{team.code}</Badge></TableCell>
                            <TableCell>
                              <form action={deleteTeam}>
                                <input type="hidden" name="id" value={team.id} />
                                <button type="submit" className="text-xs text-red-500 hover:underline">Eliminar</button>
                              </form>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
