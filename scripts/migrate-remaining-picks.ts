import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EMAILS = [
  "gv906668@gmail.com",
  "kevinalexismendiolaguajardo@gmail.com",
  "erick.perez@ipiam.edu.mx",
];

async function main() {
  const session = await prisma.duelSession.findFirst({ where: { module: "LMX_J1" } });
  if (!session) throw new Error("No session LMX_J1");

  for (const email of EMAILS) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) { console.log(`Not found: ${email}`); continue; }

    const oldBets = await prisma.matchBet.findMany({
      where: { userId: user.id, poolModule: "LMX_J1" },
      select: { id: true, matchId: true },
    });

    if (oldBets.length === 0) { console.log(`[SKIP] ${user.name} — sin picks en poolModule`); continue; }

    let migrated = 0, deleted = 0;
    for (const bet of oldBets) {
      const already = await prisma.matchBet.findUnique({
        where: { userId_matchId_duelSessionId: { userId: user.id, matchId: bet.matchId, duelSessionId: session.id } },
      });
      if (already) {
        await prisma.matchBet.delete({ where: { id: bet.id } });
        deleted++;
      } else {
        await prisma.matchBet.update({
          where: { id: bet.id },
          data: { poolModule: null, duelSessionId: session.id },
        });
        migrated++;
      }
    }
    console.log(`[OK]   ${user.name} — ${migrated} migrados, ${deleted} duplicados borrados`);
  }

  console.log("\n=== Estado final ===");
  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: session.id },
    include: { user: { select: { name: true } } },
  });
  for (const e of entries) {
    const n = await prisma.matchBet.count({ where: { userId: e.userId, duelSessionId: session.id } });
    console.log(`  ${e.user.name} — ${n} picks`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
