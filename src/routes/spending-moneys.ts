import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";

const spendingMoneysRouter = express.Router();

spendingMoneysRouter.use(authenticateToken);

spendingMoneysRouter.get(
  "/spending-moneys/chart",
  asyncHandler(async (req, res) => {
    const { userId } = req;
    const { month, year } = req.query;

    const spendingMoneys = await prisma.spendingMoney.findMany({
      where: { userId },
    });

    const targetDateSpendingMoney = spendingMoneys.filter((spendingMoney) => {
      if (month === "null" && year) {
        //연도별 데이터
        const { date } = spendingMoney;

        const dateYear = date.getFullYear();

        return parseInt(year as string) === dateYear;
      }

      if (month && year) {
        //월별 데이터
        const { date } = spendingMoney;
        const [dateYear, dateMonth] = [date.getFullYear(), date.getMonth() + 1];

        return (
          parseInt(year as string) === dateYear &&
          parseInt(month as string) === dateMonth
        );
      }

      return true;
    });

    const totalForCategory = new Map();

    targetDateSpendingMoney.forEach((spendingMoney) =>
      totalForCategory.set(
        spendingMoney.category,
        (totalForCategory.get(spendingMoney.category) || 0) +
          parseInt(spendingMoney.spentMoney)
      )
    );

    const total = targetDateSpendingMoney.reduce(
      (acc, el) => acc + parseInt(el.spentMoney),
      0
    );

    const spendingMoneysForChart = [...totalForCategory].map((el) => [
      ...el,
      targetDateSpendingMoney
        .filter((spendingMoney) => spendingMoney.category === el[0])
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    ]);

    res.send({ spendingMoneysForChart, total });
  })
);

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
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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
