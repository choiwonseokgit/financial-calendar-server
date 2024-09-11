import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";

const schedulesRouter = express.Router();

schedulesRouter.use(authenticateToken);

schedulesRouter
  .route("/schedules")
  .get(
    asyncHandler(async (req, res) => {
      const { userId } = req;
      const { month, year } = req.query;

      const schedules = await prisma.schedule.findMany({
        where: { userId },
      });

      const targetDateSchedules = schedules.filter((spendingMoney) => {
        if (month && year) {
          const { startDate } = spendingMoney;
          const [dateYear, dateMonth] = [
            startDate.getFullYear(),
            startDate.getMonth() + 1,
          ];

          return (
            parseInt(year as string) === dateYear &&
            parseInt(month as string) === dateMonth
          );
        }

        return true;
      });

      res.send(targetDateSchedules);
    })
  )
  .post(
    asyncHandler(async (req, res) => {
      const { userId } = req;

      const newData = {
        ...req.body,
        userId,
      };

      const spendingMoney = await prisma.schedule.create({
        data: newData,
      });

      res.status(201).send(spendingMoney);
    })
  );

schedulesRouter.patch(
  "/schedules/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.send(product);
  })
);

schedulesRouter.delete(
  "/schedules/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.schedule.delete({
      where: { id: parseInt(id) },
    });
    res.sendStatus(204);
  })
);

export default schedulesRouter;
