import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number; // 사용자 ID를 추가
    }
  }
}
