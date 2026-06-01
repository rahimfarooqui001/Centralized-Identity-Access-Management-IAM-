// import mongoose from "mongoose";
// import env from "./env.js";
// import logger from "../logger/index.js";

// const connectDB = async () => {
//   try {
//     mongoose.connection.on("connected", () => {
//       logger.info("MongoDB connected");
//     });

//     mongoose.connection.on("error", (err) => {
//       logger.error("MongoDB connection error", err);
//     });

//     mongoose.connection.on("disconnected", () => {
//       logger.warn("MongoDB disconnected");
//     });

//     await mongoose.connect(env.mongoUri, {
//       maxPoolSize: 10,       // connection pooling
//       serverSelectionTimeoutMS: 5000,
//     });
//   } catch (error) {
//     logger.error("MongoDB initial connection failed", error);
//     throw error;
//   }
// };

// export default connectDB;

// src/config/db.js

import mongoose from "mongoose";
import env from "./env.js";
import logger from "../logger/index.js";



const connectDB = async () => {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected", { uri: env.mongoUri.replace(/\/\/.*@/, "//***@") });
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", { error });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize:              10,
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    logger.error("MongoDB initial connection failed", { error });
    throw error;
  }
};

export default connectDB;