import axios from "axios";
import express from "express";
import prisma from "../prisma";
import asyncHandler from "../utils/async-handler";
import { CLIENT_URL, SERVER_URL } from "../constants";
import { generateToken } from "../utils/token";

const kakaoLoginRouter = express.Router();

kakaoLoginRouter.get(
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
          redirect_uri: `${SERVER_URL}/oauth/kakao`,
        },
      }
    );

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
          profileImage: (
            authInfo.data.properties.profile_image as string
          ).replace("http://", "https://"),
        },
      });
    }

    const accessToken = generateToken(user.id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true, // 클라이언트 자바스크립트에서 쿠키 접근 불가 (보안 강화)
      secure: process.env.NODE_ENV === "production", // 프로덕션 환경에서는 HTTPS 사용
      maxAge: 1 * 24 * 60 * 60 * 1000, // 쿠키 유효기간 (7일)
      sameSite: "lax", // 모바일 브라우저는 sameSite='lax', 옵션 추가 설정 지원 안되는게 대부분..
      // domain: process.env.CLIENT,
      //sameSite: "strict", // 동일 사이트 정책 //TODO 프론트 배포하고 sameSite 설정하기
    });

    res.redirect(
      `${CLIENT_URL}/auth?userId=${user.id}&accessToken=${accessToken}`
    );
  })
);

kakaoLoginRouter.get(
  "/oauth/kakao/logout",
  asyncHandler(async (req, res) => {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.redirect(`${CLIENT_URL}/auth?userId=${null}`);
  })
);

export default kakaoLoginRouter;
