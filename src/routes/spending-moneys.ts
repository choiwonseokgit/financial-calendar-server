import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";

const spendingMoneysRouter = express.Router();

spendingMoneysRouter.use(authenticateToken);

spendingMoneysRouter
  .route("/spending-moneys")
  .get(
    asyncHandler(async (req, res) => {
      const { userId } = req;
      const { month, year } = req.query;

      const targetMonthSpending = await prisma.targetMonthSpending.findUnique({
        where: {
          userId_targetDate: {
            userId: userId!,
            targetDate: `${year}/${month}`,
          },
        },
      });

      const spendingMoneys = await prisma.spendingMoney.findMany({
        where: { userId },
      });

      const targetDateSpendingMoney = spendingMoneys
        .filter((spendingMoney) => {
          if (month && year) {
            const { date } = spendingMoney;
            const [dateYear, dateMonth] = [
              date.getFullYear(),
              date.getMonth() + 1,
            ];

            return (
              parseInt(year as string) === dateYear &&
              parseInt(month as string) === dateMonth
            );
          }

          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      let total = 0;
      targetDateSpendingMoney.forEach((spendingMoney) => {
        const { spentMoney } = spendingMoney;
        total += parseInt(spentMoney);
      });

      res.send({ targetMonthSpending, targetDateSpendingMoney, total });
    })
  )
  .post(
    asyncHandler(async (req, res) => {
      const { userId } = req;

      const newData = {
        ...req.body,
        userId,
      };

      const spendingMoney = await prisma.spendingMoney.create({
        data: newData,
      });

      res.status(201).send(spendingMoney);
    })
  )
  .patch(
    asyncHandler(async (req, res) => {
      const { id } = req.body;

      const product = await prisma.spendingMoney.update({
        where: { id: parseInt(id) },
        data: req.body,
      });
      res.send(product);
    })
  )
  .delete(
    asyncHandler(async (req, res) => {
      const { id } = req.body;
      await prisma.spendingMoney.delete({
        where: { id: parseInt(id) },
      });
      res.sendStatus(204);
    })
  );

export default spendingMoneysRouter;
