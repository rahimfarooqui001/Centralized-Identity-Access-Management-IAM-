import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./redisSession.js";
import env from "./env.js";

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "sess:",

  ttl: 60 * 60 // 1 hour
});

export const sessionMiddleware = session({
  name: "auth.sid",

  store: redisStore,

  secret: env.sessionSecret,

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === "production", 
    sameSite: "lax",
    maxAge: 60 * 60 * 1000 // 1 hour (ms)
  }
});