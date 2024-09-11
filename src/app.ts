import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CLIENT_URL } from "./constants";
import kakaoLoginRouter from "./routes/kakao-login";
import usersRouter from "./routes/users";
import targetMonthSpendingRouter from "./routes/target-month-spending";
import spendingMoneysRouter from "./routes/spending-moneys";
import schedulesRouter from "./routes/schedules";
import holidaysRouter from "./routes/holidays";

const corsOptions = {
  origin: [`${CLIENT_URL}`],
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use(kakaoLoginRouter);
app.use(usersRouter);
app.use(holidaysRouter);
app.use(targetMonthSpendingRouter);
app.use(spendingMoneysRouter);
app.use(schedulesRouter);

app.listen(process.env.PORT || 4000, () => console.log("Server Started"));
