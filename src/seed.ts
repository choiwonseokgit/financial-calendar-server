import { PrismaClient } from "@prisma/client";
import { USERS } from "./mock";

const prisma = new PrismaClient();

async function main() {
  // 기존 데이터 삭제
  await prisma.user.deleteMany();

  // 목 데이터 삽입
  await prisma.user.createMany({
    data: USERS,
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
