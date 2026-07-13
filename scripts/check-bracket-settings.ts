import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const rows = await prisma.moduleSettings.findMany();
  console.log("ModuleSettings:", JSON.stringify(rows, null, 2));
  const bracket = await prisma.bracketSession.findFirst();
  console.log("BracketSession:", JSON.stringify(bracket, null, 2));
  await prisma.$disconnect();
}
main();
