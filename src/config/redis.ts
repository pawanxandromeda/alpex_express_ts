import Redis from "ioredis";

let redis: Redis | null = null;
let isConnecting = false;
let connectionPromise: Promise<void> | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // 🔑 REQUIRED for Lambda
    enableOfflineQueue: true,   // 🔑 Allow queuing when reconnecting
    lazyConnect: false,         // 🔑 Connect immediately
    connectTimeout: 10000,
    commandTimeout: 5000,       // 🔑 Prevent long-running commands from hanging
    retryStrategy(times) {
      if (times > 5) {
        console.error("❌ Redis: Max retries exceeded");
        return -1; // Stop retrying
      }
      // exponential backoff, max 1 second
      const delay = Math.min(times * 100, 1000);
      console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      const errorStr = err.toString();
      if (errorStr.includes("READONLY") || errorStr.includes("CLUSTERDOWN")) {
        return true; // Reconnect
      }
      return false;
    },
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
    isConnecting = false;
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });

  redis.on("close", () => {
    console.log("🔌 Redis connection closed");
  });
} else {
  console.log("⚠️ Redis disabled (REDIS_URL not set)");
}

/**
 * Ensure redis connection is established before sending commands
 */
export const ensureRedisConnection = async (): Promise<void> => {
  if (!redis) {
    return; // Redis not configured
  }

  // If already connected, return
  if (redis.status === "ready") {
    return;
  }

  // If already connecting, wait for the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      isConnecting = false;
      connectionPromise = null;
      reject(new Error("Redis connection timeout"));
    }, 15000);

    redis!.connect()
      .then(() => {
        clearTimeout(timeout);
        isConnecting = false;
        connectionPromise = null;
        resolve();
      })
      .catch((err) => {
        clearTimeout(timeout);
        isConnecting = false;
        connectionPromise = null;
        reject(err);
      });
  });

  return connectionPromise;
};

export default redis;
