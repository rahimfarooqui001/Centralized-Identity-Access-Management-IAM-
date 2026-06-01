import IORedis from "ioredis";
import env from "./env.js";

const connection = new IORedis({
  host: env.redis.redisHost,
  port: env.redis.redisPort,
  username: env.redis.redisUsername || "default",
  password: env.redis.redisPassword,


  maxRetriesPerRequest: null 
});

export default connection;

