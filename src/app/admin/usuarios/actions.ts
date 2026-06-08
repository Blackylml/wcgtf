"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session.user.id;
}

/** Alterna el rol USER <-> ADMIN. No puedes cambiar tu propio rol. */
export async function toggleUserRole(userId: string) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "No autorizado" };
  if (userId === adminId) return { error: "No puedes cambiar tu propio rol" };

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u) return { error: "Usuario no encontrado" };

  await prisma.user.update({
    where: { id: userId },
    data: { role: u.role === "ADMIN" ? "USER" : "ADMIN" },
  });
  revalidatePath("/admin/usuarios");
  return { success: true };
}

/** Elimina al usuario y todos sus datos asociados. No puedes eliminarte a ti mismo. */
export async function deleteUser(userId: string) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "No autorizado" };
  if (userId === adminId) return { error: "No puedes eliminarte a ti mismo" };

  await prisma.$transaction([
    prisma.groupBet.deleteMany({ where: { userId } }),
    prisma.matchBet.deleteMany({ where: { userId } }),
    prisma.specialBet.deleteMany({ where: { userId } }),
    prisma.bracketBet.deleteMany({ where: { userId } }),
    prisma.payment.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  revalidatePath("/admin/usuarios");
  return { success: true };
}
