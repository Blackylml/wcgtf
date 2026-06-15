"use server";

import { auth } from "@/auth";
import { syncResults, autoMapFixtures } from "@/lib/result-sync";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function adminSyncResults() {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  try {
    const r = await syncResults({ force: true });
    return { ok: true, ...r };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al sincronizar" };
  }
}

export async function adminAutoMapFixtures() {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  try {
    const r = await autoMapFixtures();
    return { ok: true, ...r };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al importar fixtures" };
  }
}
