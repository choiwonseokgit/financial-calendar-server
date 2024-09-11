import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

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

export default asyncHandler;
