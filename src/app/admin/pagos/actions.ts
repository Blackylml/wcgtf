"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/** Elimina un pago. Desvincula cualquier apuesta ligada (quedan sin pago) y borra el registro. */
export async function deletePayment(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "No autorizado" };

  await prisma.$transaction([
    prisma.groupBet.updateMany({ where: { paymentId: id }, data: { paymentId: null } }),
    prisma.matchBet.updateMany({ where: { paymentId: id }, data: { paymentId: null } }),
    prisma.bracketBet.updateMany({ where: { paymentId: id }, data: { paymentId: null } }),
    prisma.specialBet.updateMany({ where: { paymentId: id }, data: { paymentId: null } }),
    prisma.payment.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/pagos");
  revalidatePath("/admin/usuarios");
  return { success: true };
}
