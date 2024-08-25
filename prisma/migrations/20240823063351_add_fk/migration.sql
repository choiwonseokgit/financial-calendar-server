/*
  Warnings:

  - Added the required column `userId` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SpendingMoney` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SpendingMoney" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "SpendingMoney" ADD CONSTRAINT "SpendingMoney_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
