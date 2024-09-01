/*
  Warnings:

  - A unique constraint covering the columns `[userId,targetDate]` on the table `TargetMonthSpending` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TargetMonthSpending_userId_targetDate_key" ON "TargetMonthSpending"("userId", "targetDate");
