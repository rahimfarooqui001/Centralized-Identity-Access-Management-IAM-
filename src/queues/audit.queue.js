import { Queue } from "bullmq";
import connection from "../config/redis.js";

export const auditQueue = new Queue("audit-logs", {
  connection
});