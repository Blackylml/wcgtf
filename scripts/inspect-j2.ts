import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const pool of ["MATCHES_G2B", "MATCHES_G2"] as const) {
    const bets = await prisma.matchBet.findMany({
      where: { poolModule: pool },
      select: { userId: true, user: { select: { name: true, email: true } } },
    });
    const byUser = new Map<string, { name: string; count: number }>();
    for (const b of bets) {
      const k = b.userId;
      const cur = byUser.get(k) ?? { name: b.user.name ?? b.user.email ?? k, count: 0 };
      cur.count++;
      byUser.set(k, cur);
    }
    console.log(`\n=== ${pool} === (${bets.length} picks, ${byUser.size} usuarios)`);
    for (const [id, v] of byUser) console.log(`  ${v.name} (${id}) → ${v.count} picks`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
