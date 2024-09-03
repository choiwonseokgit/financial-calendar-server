export const SERVER_URL =
  process.env.NODE_ENV === "production"
    ? process.env.SERVER
    : process.env.SERVER_LOCAL || "http://localhost:4000";

export const CLIENT_URL =
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT
    : process.env.CLIENT_LOCAL || "http://localhost:3000";
