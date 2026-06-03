import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redisSession.js";
import env from "../config/env.js";

export const globalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),

  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },

  skip: () => env.nodeEnv === "test",
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),

  windowMs: 15 * 60 * 1000,
  max: 10,

  keyGenerator: (req) => {
    const email =
      req.body?.email?.toLowerCase() || "unknown";

      const ip = ipKeyGenerator(req.ip);

    return `${ip}:${email}`;
  },

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many login attempts. Try again in 15 minutes.",
  },
});