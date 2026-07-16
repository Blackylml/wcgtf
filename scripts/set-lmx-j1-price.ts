import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.moduleSettings.upsert({
    where: { module: "LMX_J1" },
    create: { module: "LMX_J1", price: 100, entryOpen: true },
    update: { price: 100 },
  });
  console.log("LMX_J1 price = $100 ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
