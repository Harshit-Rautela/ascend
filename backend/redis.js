
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});
export async function connectRedis() {
    try {
        if (redis.status === "wait") {
            await redis.connect();
        }

        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Redis connection failed:", error.message);
    }
}


export default redis;
