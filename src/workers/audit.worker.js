// workers/audit.worker.js

import { Worker } from "bullmq";
import connection from "../config/redis.js";
import AuditLogModel from "../models/auditLog.model.js";
import logger from "../logger/index.js";
import connectDB from "../config/db.js";

await connectDB();

const worker = new Worker(
  "audit-logs",
  async (job) => {
    const data = job.data;
    console.log(data,'from audit worker')

    try {
      await AuditLogModel.create({
        event: data.event,
        message: data.message,

        userId: data.userId || null,
        email: data.email || null,
        appId: data.appId || null,

        status: data.status,
        reason: data.reason,

        ip: data.ip,
        userAgent: data.userAgent,

        metadata: data.metadata || {}
      });

      logger.info(data.event, {
        message: data.message || "Audit log stored",
        userId: data.userId,
        appId: data.appId,
        status: data.status
       
      });

    } catch (err) {
      logger.error("audit.log.failed", {
        message: "Failed to process audit job",
        error: err.message,
        event: data.event,
        userId: data.userId || null,
        email: data.email || null
      });

      throw err; 
    }
  },
  { connection }
);

export default worker;