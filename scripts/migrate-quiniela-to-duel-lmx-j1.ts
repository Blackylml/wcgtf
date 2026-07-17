import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Usuarios con Payment APPROVED en LMX_J1 pero sin DuelEntry
const TARGET_EMAILS = [
  "erick.perez@ipiam.edu.mx",
  "gv906668@gmail.com",
  "kevinalexismendiolaguajardo@gmail.com",
];

async function main() {
  // Buscar la sesión de duelo LMX_J1
  const session = await prisma.duelSession.findFirst({
    where: { module: "LMX_J1" },
  });
  if (!session) throw new Error("No se encontró sesión de duelo LMX_J1");
  console.log(`Sesión: ${session.label} (${session.id})`);

  // Buscar los usuarios
  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: { id: true, name: true, email: true, credits: true },
  });
  console.log(`\nUsuarios encontrados: ${users.length}`);

  for (const user of users) {
    const name = user.name ?? user.email;

    // Verificar que no esté ya inscrito
    const existing = await prisma.duelEntry.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
    });
    if (existing) {
      console.log(`  [SKIP] ${name} — ya tiene DuelEntry`);
      continue;
    }

    // Crear DuelEntry (el pago ya existe, no se cobra de nuevo)
    await prisma.duelEntry.create({
      data: { sessionId: session.id, userId: user.id },
    });
    console.log(`  [OK]   ${name} <${user.email}> — inscrito en ${session.label}`);
  }

  // Resumen final
  const allEntries = await prisma.duelEntry.findMany({
    where: { sessionId: session.id },
    include: { user: { select: { name: true, email: true } } },
  });
  console.log(`\nTotal inscritos en duelo: ${allEntries.length}`);
  for (const e of allEntries) {
    const status = e.refunded ? "[reembolsado]" : e.paired ? "[emparejado]" : "[esperando]";
    console.log(`  ${e.user.name ?? e.user.email} ${status}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
