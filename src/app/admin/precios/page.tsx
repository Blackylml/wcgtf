import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MODULE_META, ALL_MODULES } from "@/lib/modules";
import { saveModuleSettings } from "./actions";

export default async function PreciosAdminPage() {
  const settings = await prisma.moduleSettings.findMany();
  const byModule = new Map(settings.map((s) => [String(s.module), s]));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Precios por módulo</h1>
      <p className="text-sm text-gray-500 mb-6">
        Un solo precio por módulo: el usuario paga <strong>una vez</strong> para entrar a la pool y puede llenar todas
        las apuestas de ese módulo. Precio en <strong>0 = gratis</strong> (sin pago). Sus apuestas suman puntos al aprobarse el pago.
      </p>

      <Card>
        <CardContent className="py-5">
          <form action={saveModuleSettings} className="space-y-4">
            {ALL_MODULES.map((m) => {
              const s = byModule.get(m);
              const price = s ? Number(s.price) : 0;
              const open = s?.entryOpen ?? true;
              return (
                <div key={m} className="flex items-center justify-between gap-4 border-b last:border-0 pb-4 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{MODULE_META[m].label}</p>
                    <p className="text-xs text-gray-400">{m}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Precio</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number" name={`price_${m}`} min={0} step="1" defaultValue={price}
                          className="w-28 rounded-md border border-gray-300 pl-6 pr-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
                        />
                      </div>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name={`open_${m}`} defaultChecked={open} className="h-4 w-4 rounded border-gray-300" />
                      Entrada abierta
                    </label>
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <Button type="submit">Guardar precios</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
