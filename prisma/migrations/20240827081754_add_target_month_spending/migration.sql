-- CreateTable
CREATE TABLE "TargetMonthSpending" (
    "id" SERIAL NOT NULL,
    "targetDate" TEXT NOT NULL,
    "targetMoney" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TargetMonthSpending_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TargetMonthSpending" ADD CONSTRAINT "TargetMonthSpending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
