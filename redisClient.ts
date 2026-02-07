import Redis from 'ioredis';

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: Redis;
};

export const redis =
  globalForRedis.redisClient ??
  new Redis(process.env.REDIS_URL!, {
    // Optional: good defaults for Next.js / serverless
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff with cap
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

// In dev mode, attach it to global so next reload reuses it
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}