import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const generateToken = (userId: number, type: "access" | "refresh") => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: type === "access" ? "15m" : "7d",
  });
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies.accessToken; // 쿠키에서 토큰 가져오기

  if (!accessToken) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // 토큰을 디코딩
    const decoded: any = jwt.verify(accessToken, process.env.JWT_SECRET!);
    req.userId = decoded.id;
    // payload에서 userId를 추출

    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
