import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  console.log("users:", users);
  const demo = await prisma.user.findUnique({
    where: { email: "demo@student.app" },
  });
  console.log("demo exists:", Boolean(demo));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
