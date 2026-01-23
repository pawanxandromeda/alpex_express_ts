import Redis from "ioredis";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : (null as unknown as Redis);

if (process.env.REDIS_URL) {
  redis.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error", err);
  });
} else {
  console.log("⚠️ Redis disabled (REDIS_URL not set)");
}

export default redis;
