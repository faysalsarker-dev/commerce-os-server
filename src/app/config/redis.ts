import { createClient } from "redis";
import { config } from ".";

export const redisClient = createClient({
  url: config.db.redisUrl,
});

redisClient.on("connect", () => {
  console.log("🟢 Redis connected");
});

redisClient.on("error", (err) => {
  console.error("🔴 Redis error:", err);
});