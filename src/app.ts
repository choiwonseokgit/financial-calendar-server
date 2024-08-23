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

app.listen(process.env.PORT || 4000, () => console.log("Server Started"));
