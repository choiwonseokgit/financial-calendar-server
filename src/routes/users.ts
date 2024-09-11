import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";

const usersRouter = express.Router();

usersRouter.get(
  "/users",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req;

    const userData = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.send(userData);
  })
);

usersRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: parseInt(id) },
    });
    res.send(user);
  })
);

usersRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    // assert(req.body, CreateUser);

    const user = await prisma.user.create({
      data: req.body,
    });
    // 리퀘스트 바디 내용으로 유저 생성
    res.status(201).send(user);
  })
);

usersRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    // assert(req.body, PatchUser);

    const { id } = req.params;
    // 리퀘스트 바디 내용으로 id에 해당하는 유저 수정
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.send(user);
  })
);

usersRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // id에 해당하는 유저 삭제
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.sendStatus(204);
  })
);

export default usersRouter;
