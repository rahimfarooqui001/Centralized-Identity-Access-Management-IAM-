import { createClient } from "redis";
import env from "./env.js";

const redisClient = createClient({
  socket: {
    host: env.redis.redisHost || "127.0.0.1",
    port: env.redis.redisPort || 6379
  },
  username: env.redis.redisUsername || undefined,
  password: env.redis.redisPassword || undefined
});

redisClient.on("connect", () => {
  console.log("✅ Redis (session) connected");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis (session) error:", err);
});

await redisClient.connect();

export default redisClient;