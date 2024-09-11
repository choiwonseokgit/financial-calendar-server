import { PrismaClient } from "@prisma/client";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const timeZone = "Asia/Seoul";

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const convertDatesToUtc = (args: any) => {
          if (!args.data) return args;

          const { data } = args;

          Object.keys(data).forEach((key) => {
            if (data[key] instanceof Date) {
              data[key] = fromZonedTime(data[key], timeZone);
            } else if (typeof data[key] === "object" && data[key] !== null) {
              //내부가 객체인 경우
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
                data[key] = toZonedTime(data[key], timeZone);
              } else if (typeof data[key] === "object" && data[key] !== null) {
                //내부가 객체인 경우
                convertDatesFromUtc(data[key]);
              }
            });
          }
        };

        if (args) {
          convertDatesToUtc(args);
        }

        const result = await query(args);

        if (result) convertDatesFromUtc(result);

        return result;
      },
    },
  },
});

export default prisma;
