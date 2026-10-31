
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export default redis;
