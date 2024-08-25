import * as dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { assert } from "superstruct";
import { CreateUser, PatchUser } from "./struct";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

type Handler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void>;

const asyncHandler = (handler: Handler) => {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (
        (e as Error).name === "StructError" ||
        e instanceof Prisma.PrismaClientValidationError
      ) {
        res.status(400).send({ message: (e as Error).message });
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        res.sendStatus(404);
      } else {
        res.status(500).send({ message: (e as Error).message });
      }
    }
  };
};

/*********** users ***********/
app.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany();
    res.send(users);
  })
);

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: parseInt(id) },
    });
    res.send(user);
  })
);

app.post(
  "/users",
  asyncHandler(async (req, res) => {
    assert(req.body, CreateUser);

    const user = await prisma.user.create({
      data: req.body,
    });
    // 리퀘스트 바디 내용으로 유저 생성
    res.status(201).send(user);
  })
);

app.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    assert(req.body, PatchUser);

    const { id } = req.params;
    // 리퀘스트 바디 내용으로 id에 해당하는 유저 수정
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.send(user);
  })
);

app.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // id에 해당하는 유저 삭제
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.sendStatus(204);
  })
);

/*********** spending-moneys ***********/

//TODO: query string으로 각 달의 데이터를 요청할 수 있게끔
app.get(
  "/spending-moneys/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { month, year } = req.query;

    console.log(month, year);

    const spendingMoneys = await prisma.spendingMoney.findMany({
      where: { userId: parseInt(userId) },
    });

    const targetDateSpendingMoney = spendingMoneys.filter((spendingMoney) => {
      if (month && year) {
        const { date } = spendingMoney;
        const [dateYear, dateMonth] = [date.getFullYear(), date.getMonth() + 1];

        return (
          parseInt(year as string) === dateYear &&
          parseInt(month as string) === dateMonth
        );
      }

      return true;
    });

    let total = 0;
    targetDateSpendingMoney.forEach((spendingMoney) => {
      const { spentMoney } = spendingMoney;
      total += parseInt(spentMoney);
    });

    res.send({ targetDateSpendingMoney, total });
  })
);

app.post(
  "/spending-moneys",
  asyncHandler(async (req, res) => {
    const spendingMoney = await prisma.spendingMoney.create({
      data: req.body,
    });

    res.status(201).send(spendingMoney);
  })
);

app.patch(
  "/spending-moneys/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.spendingMoney.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.send(product);
  })
);

app.delete(
  "/spending-moneys/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.spendingMoney.delete({
      where: { id: parseInt(id) },
    });
    res.sendStatus(204);
  })
);

/*********** schedules ***********/

app.get(
  "/schedules/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const spendingMoneys = await prisma.schedule.findMany({
      where: { userId: parseInt(userId) },
    });

    res.send(spendingMoneys);
  })
);

app.post(
  "/schedules",
  asyncHandler(async (req, res) => {
    console.log(req.body);

    const spendingMoney = await prisma.schedule.create({
      data: req.body,
    });

    res.status(201).send(spendingMoney);
  })
);

app.patch(
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

app.delete(
  "/schedules/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.schedule.delete({
      where: { id: parseInt(id) },
    });
    res.sendStatus(204);
  })
);

app.listen(process.env.PORT || 4000, () => console.log("Server Started"));
