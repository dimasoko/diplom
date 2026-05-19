import dotenv from "dotenv";

import app from "./app";
import { startCronJobs } from "./cron";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

startCronJobs();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
