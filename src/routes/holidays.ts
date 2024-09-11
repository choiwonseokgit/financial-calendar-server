import express from "express";
import asyncHandler from "../utils/async-handler";
import { authenticateToken } from "../utils/token";
import axios from "axios";

const holidaysRouter = express.Router();

holidaysRouter.use(authenticateToken);

holidaysRouter.route("/holidays").get(
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    console.log(month, year);

    const {
      data: {
        response: { body },
      },
    } = await axios.get(
      `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${process.env.OPEN_API_KEY}&solYear=${year}&solMonth=${month}&_type=json`
    );

    const holidays = body.items.item ?? null;

    res.status(200).json({ holidays });
  })
);

export default holidaysRouter;
