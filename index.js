
// index.js

import app from "./app.js";
import logger from "./src/logger/index.js";
import connectDB from "./src/config/db.js";
import env from "./src/config/env.js";
import mongoose from "mongoose";
import { seedSystemRoles } from "./src/scripts/seedSystemRoles.js";
import { bootstrapAdmin } from "./src/scripts/bootstrapAdmin.js";



let server;

const startServer = async () => {
  try {
    await connectDB();

    await seedSystemRoles();
     await bootstrapAdmin(); 
    server = app.listen(env.port, () => {
      logger.info("Server started", {
        port:        env.port,
        environment: env.nodeEnv,
      });
    });
  } catch (error) {
    logger.error("Server failed to start", { error });
    process.exit(1);
  }
};




const shutdown = async (signal) => {
  logger.info("Shutdown signal received", { signal });

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info("HTTP server closed");
    }

    await mongoose.connection.close(false);
    logger.info("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGINT",  () => shutdown("SIGINT"));   
process.on("SIGTERM", () => shutdown("SIGTERM"));  



startServer();