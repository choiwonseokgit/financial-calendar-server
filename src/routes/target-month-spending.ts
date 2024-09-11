import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";

const targetMonthSpendingRouter = express.Router();

targetMonthSpendingRouter.use(authenticateToken);

targetMonthSpendingRouter
  .route("/target-month-spending")
  .post(
    asyncHandler(async (req, res) => {
      const { userId } = req;

      const { month, year } = req.query;

      const isExistingData = await prisma.targetMonthSpending.findUnique({
        where: {
          userId_targetDate: {
            userId: userId!,
            targetDate: `${year}/${month}`,
          },
        },
      });

      if (isExistingData) {
        res
          .status(400)
          .send({ message: "해당 날짜에 이미 목표 지출이 설정되어 있습니다." });
        return;
      }

      const newTargetSpendingMoney = await prisma.targetMonthSpending.create({
        data: {
          userId: userId!,
          targetDate: `${year}/${month}`,
          ...req.body,
        },
      });

      res.status(201).send(newTargetSpendingMoney);
    })
  )
  .patch(
    asyncHandler(async (req, res) => {
      const { userId } = req;
      const { month, year } = req.query;

      const isExistingData = await prisma.targetMonthSpending.findUnique({
        where: {
          userId_targetDate: {
            userId: userId!,
            targetDate: `${year}/${month}`,
          },
        },
      });

      if (!isExistingData) {
        res
          .status(404)
          .send({ message: "해당 날짜에 목표 지출이 존재하지 않습니다." });
        return;
      }

      const updatedTargetSpendingMoney =
        await prisma.targetMonthSpending.update({
          where: {
            userId_targetDate: {
              userId: userId!,
              targetDate: `${year}/${month}`,
            },
          },
          data: {
            ...req.body,
          },
        });

      res.status(200).send(updatedTargetSpendingMoney);
    })
  )
  .delete(
    asyncHandler(async (req, res) => {
      const { userId } = req;
      const { month, year } = req.query;

      const isExistingData = await prisma.targetMonthSpending.findUnique({
        where: {
          userId_targetDate: {
            userId: userId!,
            targetDate: `${year}/${month}`,
          },
        },
      });

      if (!isExistingData) {
        res
          .status(404)
          .send({ message: "해당 날짜에 목표 지출이 존재하지 않습니다." });
        return;
      }

      await prisma.targetMonthSpending.delete({
        where: {
          userId_targetDate: {
            userId: userId!,
            targetDate: `${year}/${month}`,
          },
        },
      });

      res.sendStatus(204); // 성공적으로 삭제되었음을 알리는 상태 코드
    })
  );

export default targetMonthSpendingRouter;
