import * as dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import cors from "cors";
import axios from "axios";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { addHours, parse, parseISO, subHours } from "date-fns";
import { toZonedTime, fromZonedTime, getTimezoneOffset } from "date-fns-tz";

// const timeZone = "UTC";
// const timeZone = "America/New_York";
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(timeZone);

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        // await prisma.$executeRaw`SET TIME ZONE 'Asia/Seoul'`;
        //console.log(args);
        // return query(args);

        const convertDatesToUtc = (args: any) => {
          if (!args.data) return args;

          const { data } = args;
          // console.log("hi");

          Object.keys(data).forEach((key) => {
            if (data[key] instanceof Date) {
              data[key] = toZonedTime(data[key], timeZone);
            } else if (typeof data[key] === "object" && data[key] !== null) {
              convertDatesToUtc(data[key]);
            }
          });
        };

        const convertDatesFromUtc = (data: any) => {
          if (Array.isArray(data)) {
            data.forEach((item) => {
              convertDatesFromUtc(item);
            });
          } else {
            Object.keys(data).forEach((key) => {
              if (data[key] instanceof Date) {
                data[key] = fromZonedTime(data[key], timeZone);
              } else if (typeof data[key] === "object" && data[key] !== null) {
                convertDatesFromUtc(data[key]);
              }
            });
          }
        };

        if (args) {
          convertDatesToUtc(args);
        }

        // console.log("changed", args);

        const result = await query(args);

        convertDatesFromUtc(result);
        //console.log("result", result);
        // console.log(fromZonedTime(new Date(), timeZone));

        return result;
      },
    },
  },
});

const generateToken = (userId: number) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
};

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies.accessToken; // 쿠키에서 토큰 가져오기

  if (!accessToken) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // 토큰을 디코딩하여 payload를 얻습니다.
    const decoded: any = jwt.verify(accessToken, process.env.JWT_SECRET!);
    req.userId = decoded.id;
    // payload에서 userId를 추출합니다.

    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

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

/*********** social-login ***********/
app.get(
  "/oauth/kakao",
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    // 토큰발급받기
    const authToken = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_LOGIN_CLIENT_ID,
          code,
          redirect_uri: `https://financial-calendar-server.onrender.com/oauth/kakao`,
          // redirect_uri: `http://localhost:4000/oauth/kakao`,
        },
      }
    );

    // console.log("authToken", authToken);
    const authInfo = await axios.post(
      "https://kapi.kakao.com/v2/user/me",
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Bearer " + authToken.data.access_token,
        },
      }
    );

    const kakaoId = authInfo.data.id;

    let user = await prisma.user.findUnique({
      where: { kakaoId: kakaoId.toString() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          kakaoId: kakaoId.toString(),
          nickname: authInfo.data.properties.nickname,
          profileImage: authInfo.data.properties.profile_image,
        },
      });
    }

    const accessToken = generateToken(user.id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true, // 클라이언트 자바스크립트에서 쿠키 접근 불가 (보안 강화)
      secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서는 HTTPS 사용
      maxAge: 1 * 24 * 60 * 60 * 1000, // 쿠키 유효기간 (7일)
      sameSite: "none", // 동일 사이트 정책 //TODO 프론트 배포하고 sameSite 설정하기
      //sameSite: "strict", // 동일 사이트 정책 //TODO 프론트 배포하고 sameSite 설정하기
    });

    res.redirect(`http://localhost:3000/auth?userId=${user.id}`);
  })
);

app.get(
  "/oauth/kakao/logout",
  asyncHandler(async (req, res) => {
    // console.log("소셜 로그인 로그아웃");

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.redirect(`http://localhost:3000/auth?userId=${null}`);
  })
);

/*********** users ***********/
app.get(
  "/users",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req;

    const userData = await prisma.user.findUnique({
      where: { id: userId },
    });

    // console.log(userData);
    res.send(userData);
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
    // assert(req.body, CreateUser);

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

app.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // id에 해당하는 유저 삭제
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.sendStatus(204);
  })
);

/*********** target-month-spending ***********/
app.post(
  "/target-month-spending",
  authenticateToken,
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
);

app.patch(
  "/target-month-spending",
  authenticateToken,
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

    const updatedTargetSpendingMoney = await prisma.targetMonthSpending.update({
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
);

app.delete(
  "/target-month-spending",
  authenticateToken,
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

/*********** spending-moneys ***********/

//TODO: query string으로 각 달의 데이터를 요청할 수 있게끔
app.get(
  "/spending-moneys",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req;
    // const { userId } = req.params;
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

    // const formatTargetDateSpendingMoney = targetDateSpendingMoney.map(
    //   (data) => ({
    //     ...data,
    //     date: addHours(data.date, 9),
    //   })
    // );

    res.send({ targetMonthSpending, targetDateSpendingMoney, total });
  })
);

app.post(
  "/spending-moneys",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req;

    // console.log(req.body);

    const newData = {
      ...req.body,
      date: addHours(parseISO(req.body.date), 9),
      userId,
    };

    const spendingMoney = await prisma.spendingMoney.create({
      data: newData,
    });

    res.status(201).send(spendingMoney);
  })
);

app.patch(
  "/spending-moneys",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.body;
    // console.log(req.body);

    // const formatData = {
    //   ...req.body,
    //   date: addHours(req.body.date, 9),
    // };

    const product = await prisma.spendingMoney.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.send(product);
  })
);

app.delete(
  "/spending-moneys",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.body;
    await prisma.spendingMoney.delete({
      where: { id: parseInt(id) },
    });
    res.sendStatus(204);
  })
);

/*********** schedules ***********/

app.get(
  "/schedules",
  authenticateToken,
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
);

app.post(
  "/schedules",
  authenticateToken,
  asyncHandler(async (req, res) => {
    // console.log(req.body);

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

app.patch(
  "/schedules",
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
  "/schedules",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.schedule.delete({
      where: { id: parseInt(id) },
    });
    res.sendStatus(204);
  })
);

app.listen(process.env.PORT || 4000, () => console.log("Server Started"));
