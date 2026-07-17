import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Par fijo: Gilberto vs Andres
const FIXED_EMAIL_1 = "gilbertohardy13@gmail.com";
const FIXED_EMAIL_2 = "andrestrevino0904@gmail.com";

async function main() {
  const session = await prisma.duelSession.findFirst({ where: { module: "LMX_J1" } });
  if (!session) throw new Error("No session LMX_J1");
  if (session.pairingDone) throw new Error("Ya fue emparejada esta sesión. Aborting.");

  console.log(`Sesión: ${session.label} (${session.id})`);

  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: session.id, paired: false, refunded: false },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  console.log(`\nParticipantes sin emparejar: ${entries.length}`);
  for (const e of entries) console.log(`  ${e.user.name} <${e.user.email}>`);

  const fixed1 = entries.find((e) => e.user.email === FIXED_EMAIL_1);
  const fixed2 = entries.find((e) => e.user.email === FIXED_EMAIL_2);
  if (!fixed1) throw new Error(`No encontrado: ${FIXED_EMAIL_1}`);
  if (!fixed2) throw new Error(`No encontrado: ${FIXED_EMAIL_2}`);

  // Resto: los que no son el par fijo
  const rest = entries.filter((e) => e.id !== fixed1.id && e.id !== fixed2.id);

  // Shuffle resto (Fisher-Yates)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  const prize = Number(session.entryFee) * 2 * (1 - session.houseCutPct / 100);
  const pairCount = Math.floor(rest.length / 2);
  const leftover = rest.length % 2 === 1 ? rest[rest.length - 1] : null;

  console.log(`\nPar fijo: ${fixed1.user.name} vs ${fixed2.user.name}`);
  for (let i = 0; i < pairCount; i++) {
    console.log(`Par aleatorio: ${rest[i * 2].user.name} vs ${rest[i * 2 + 1].user.name}`);
  }
  if (leftover) console.log(`Sin pareja (reembolso): ${leftover.user.name}`);

  // Claim atómico
  const claim = await prisma.duelSession.updateMany({
    where: { id: session.id, pairingDone: false },
    data: { isOpen: false, pairingDone: true },
  });
  if (claim.count === 0) throw new Error("Otra llamada ya emparejó esta sesión.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  // Par fijo
  ops.push(
    prisma.duelPair.create({
      data: { sessionId: session.id, user1Id: fixed1.userId, user2Id: fixed2.userId, prizePool: prize },
    })
  );

  // Pares aleatorios del resto
  for (let i = 0; i < pairCount; i++) {
    ops.push(
      prisma.duelPair.create({
        data: { sessionId: session.id, user1Id: rest[i * 2].userId, user2Id: rest[i * 2 + 1].userId, prizePool: prize },
      })
    );
  }

  // Marcar como emparejados
  const pairedIds = [fixed1.id, fixed2.id, ...rest.slice(0, pairCount * 2).map((e) => e.id)];
  ops.push(prisma.duelEntry.updateMany({ where: { id: { in: pairedIds } }, data: { paired: true } }));

  // Reembolso si sobra uno
  if (leftover) {
    ops.push(
      prisma.duelEntry.update({ where: { id: leftover.id }, data: { refunded: true } }),
      prisma.user.update({ where: { id: leftover.userId }, data: { credits: { increment: session.entryFee } } }),
      prisma.creditTransaction.create({
        data: {
          userId: leftover.userId,
          amount: session.entryFee,
          type: "REFUND",
          description: `Reembolso sin pareja: ${session.label}`,
          refId: session.id,
        },
      })
    );
  }

  await prisma.$transaction(ops);
  console.log("\n✓ Emparejamiento completado.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
