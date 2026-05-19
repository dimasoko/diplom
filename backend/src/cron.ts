import cron from "node-cron";

import { prisma } from "./lib/prisma";

export const startCronJobs = (): void => {
  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        await prisma.refreshToken.deleteMany({
          where: {
            expires_at: {
              lt: new Date(),
            },
          },
        });
      } catch (error) {
        console.error("Failed to cleanup expired sessions", error);
      }
    },
    { timezone: "UTC" },
  );
};
