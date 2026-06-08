"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { Module } from "@/generated/prisma/client";
import { ALL_MODULES } from "@/lib/modules";

export async function saveModuleSettings(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return;

  for (const m of ALL_MODULES) {
    const raw = Number(formData.get(`price_${m}`) ?? 0);
    const price = Number.isFinite(raw) && raw >= 0 ? raw : 0;
    const entryOpen = formData.get(`open_${m}`) === "on";
    await prisma.moduleSettings.upsert({
      where: { module: m as Module },
      create: { module: m as Module, price, entryOpen },
      update: { price, entryOpen },
    });
  }
  revalidatePath("/admin/precios");
}
