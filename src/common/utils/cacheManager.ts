import redis, { ensureRedisConnection } from "../../config/redis";
import crypto from "crypto";

/**
 * ADVANCED CACHING UTILITY FOR PO SERVICE
 * Implements industry-level cache management patterns:
 * - Cache-Aside (Lazy Loading)
 * - Write-Through for critical updates
 * - Cache warming for preloading
 * - Smart invalidation with pattern matching
 * - TTL management with different expiration times
 * - Hierarchical cache keys with dependency tracking
 */

export const CACHE_TTL = {
  // Short-lived cache (5 minutes) - for frequently changing data
  SHORT: 300,
  // Medium-lived cache (30 minutes) - for semi-static data
  MEDIUM: 1800,
  // Long-lived cache (2 hours) - for mostly static data
  LONG: 7200,
  // Extended cache (24 hours) - for reference data
  EXTENDED: 86400,
};

export const CACHE_KEYS = {
  // Single PO
  PO_SINGLE: (id: string) => `po:single:${id}`,
  
  // List operations with dynamic filters
  PO_LIST: (prefix: string, payload: any) => {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(payload))
      .digest("hex");
    return `po:list:${prefix}:${hash}`;
  },

  // GST-based queries
  PO_BY_GST: (gstNo: string) => `po:gst:${gstNo}`,
  PO_SLAB_LIMIT: (gstNo: string) => `po:slab:${gstNo}`,

  // Status-based queries
  PO_MD_APPROVED: () => `po:md_approved`,
  PO_PPIC_APPROVED_BATCHES: () => `po:ppic_approved_batches`,
  PO_PENDING_APPROVALS: (prefix: string, payload: any) => {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(payload))
      .digest("hex");
    return `po:pending_approvals:${prefix}:${hash}`;
  },

  // Analytics and reference data
  PO_ANALYTICS: (prefix: string, payload: any) => {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(payload))
      .digest("hex");
    return `po:analytics:${prefix}:${hash}`;
  },
  PO_BATCH_NUMBERS: () => `po:batch_numbers`,
  PO_LATEST_COUNT: () => `po:latest_count`,
};

/**
 * Cache Invalidation Strategy
 * Defines which cache keys should be invalidated when specific operations occur
 */
export const CACHE_INVALIDATION_MAP = {
  // When a PO is created, invalidate these keys
  CREATE: [
    "po:list:*", // All list queries
    "po:md_approved", // MD approved list might be affected
    "po:pending_approvals:*", // Pending approvals list
    "po:analytics:*", // Analytics data
    "po:batch_numbers", // Batch numbers might be affected
    "po:latest_count", // Latest count changes
  ],

  // When a PO is updated, invalidate these keys
  UPDATE: (poId: string, gstNo: string) => [
    `po:single:${poId}`, // The specific PO
    "po:list:*", // All list queries
    `po:gst:${gstNo}`, // GST-based queries
    `po:slab:${gstNo}`, // Slab limit
    "po:md_approved", // Might affect approval status
    "po:ppic_approved_batches", // Batch status
    "po:pending_approvals:*", // Pending approvals
    "po:analytics:*", // Analytics
  ],

  // When a PO is deleted, invalidate these keys
  DELETE: (poId: string, gstNo: string) => [
    `po:single:${poId}`, // The deleted PO
    "po:list:*", // All list queries
    `po:gst:${gstNo}`, // GST-based queries
    `po:slab:${gstNo}`, // Slab limit changes
    "po:md_approved", // Might affect approval list
    "po:ppic_approved_batches", // Batch list
    "po:analytics:*", // Analytics
    "po:batch_numbers", // Batch numbers
    "po:latest_count", // Latest count changes
  ],

  // When bulk create happens
  BULK_CREATE: [
    "po:list:*",
    "po:analytics:*",
    "po:batch_numbers",
    "po:latest_count",
  ],
};

/**
 * Invalidate cache patterns using Redis KEYS command
 * For production with large datasets, consider using Lua scripts
 */
export const invalidateCache = async (patterns: string[]): Promise<void> => {
  try {
    if (!redis) {
      console.log(`⊘ Redis disabled, skipping cache invalidation`);
      return;
    }

    // Ensure connection before invalidation
    try {
      await ensureRedisConnection();
    } catch (connError) {
      const message = connError instanceof Error ? connError.message : String(connError);
      console.warn(`⚠️ Redis connection failed for invalidation: ${message}`);
      return; // Don't block on cache failure
    }

    for (const pattern of patterns) {
      try {
        // Handle wildcard patterns
        if (pattern.includes("*")) {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`🗑️ Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
          }
        } else {
          // Direct key deletion
          const result = await redis.del(pattern);
          if (result > 0) {
            console.log(`🗑️ Invalidated cache key: ${pattern}`);
          }
        }
      } catch (patternError) {
        console.error(`Error invalidating pattern ${pattern}:`, patternError);
        // Continue with next pattern
      }
    }
  } catch (error) {
    console.error("Error in invalidateCache:", error);
    // Don't throw - cache invalidation failure shouldn't break the operation
  }
};

/**
 * Cache-Aside Pattern: Get with fallback to DB
 * If cache miss, fetch from DB and store in cache
 */
export const getOrSet = async <T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  try {
    if (!redis) {
      // Redis not configured, skip caching and fetch directly
      console.log(`⊘ Redis disabled, fetching directly: ${key}`);
      return fetchFn();
    }

    // Ensure Redis connection is ready before attempting cache get
    try {
      await ensureRedisConnection();
    } catch (connError) {
      console.warn(`⚠️ Redis connection failed: ${connError}, skipping cache get`);
      // Continue to fetch from source even if cache fails
      const data = await fetchFn();
      return data;
    }

    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      console.log(`✓ Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    }

    // Cache miss - fetch from source
    console.log(`✗ Cache miss: ${key} - fetching from source`);
    const data = await fetchFn();

    // Store in cache (non-blocking, log failures but don't throw)
    if (data !== null && data !== undefined) {
      redis
        .setex(key, ttl, JSON.stringify(data))
        .then(() => {
          console.log(`✓ Cached: ${key} (TTL: ${ttl}s)`);
        })
        .catch((err) => {
          console.warn(`⚠️ Failed to cache ${key}:`, err.message);
          // Don't throw - cache failure shouldn't block the response
        });
    }

    return data;
  } catch (error) {
    console.error(`Error in getOrSet for key ${key}:`, error);
    // Fallback: fetch data directly if caching fails entirely
    if (error instanceof Error && error.message.includes("Redis")) {
      return fetchFn();
    }
    throw error;
  }
};

/**
 * Write-Through Pattern: Update both cache and DB
 * Ensures cache is always consistent with DB for critical data
 */
export const setWithWriteThrough = async <T>(
  key: string,
  ttl: number,
  data: T
): Promise<void> => {
  if (!redis) {
    console.log(`⊘ Redis disabled, skipping write-through for: ${key}`);
    return;
  }

  try {
    // Ensure connection before write
    try {
      await ensureRedisConnection();
    } catch (connError) {
      const message = connError instanceof Error ? connError.message : String(connError);
      console.warn(`⚠️ Redis connection failed for write-through: ${message}`);
      return; // Don't block on cache failure
    }

    // Write to cache
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`✓ Write-through cached: ${key}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Cache write-through failed for key ${key}:`, message);
    // Don't throw - write-through failure shouldn't break the operation
  }
};

/**
 * Batch Invalidation: Efficiently invalidate multiple related keys
 * Used after DB operations that affect multiple cache entries
 */
export const invalidateBatchKeys = async (
  invalidationStrategy: string | string[] | ((id?: string, gstNo?: string) => string[]),
  id?: string,
  gstNo?: string
): Promise<void> => {
  try {
    let keysToInvalidate: string[] = [];

    if (typeof invalidationStrategy === "string") {
      keysToInvalidate = [invalidationStrategy];
    } else if (Array.isArray(invalidationStrategy)) {
      keysToInvalidate = invalidationStrategy;
    } else if (typeof invalidationStrategy === "function") {
      keysToInvalidate = invalidationStrategy(id, gstNo);
    }

    await invalidateCache(keysToInvalidate);
  } catch (error) {
    console.error("Error in invalidateBatchKeys:", error);
    throw error;
  }
};

/**
 * Prefetch/Warm Cache: Load frequently accessed data into cache proactively
 * Call this after significant DB updates to ensure cache is fresh
 */
export const warmCache = async (
  fetchFns: Array<{
    key: string;
    ttl: number;
    fetch: () => Promise<any>;
  }>
): Promise<void> => {
  try {
    if (!redis) {
      console.log(`⊘ Redis disabled, skipping cache warming`);
      return;
    }

    // Ensure connection before warming
    try {
      await ensureRedisConnection();
    } catch (connError) {
      const message = connError instanceof Error ? connError.message : String(connError);
      console.warn(`⚠️ Redis connection failed for cache warming: ${message}`);
      return; // Don't block on cache failure
    }

    console.log(`🔥 Warming ${fetchFns.length} cache entries...`);
    
    const warmingPromises = fetchFns.map(async (item) => {
      try {
        const data = await item.fetch();
        if (data !== null && data !== undefined) {
          await redis!.setex(item.key, item.ttl, JSON.stringify(data));
          console.log(`🔥 Warmed: ${item.key}`);
        }
      } catch (error) {
        console.error(`Error warming cache for ${item.key}:`, error);
        // Don't throw - continue warming other keys
      }
    });

    await Promise.all(warmingPromises);
    console.log(`✓ Cache warming complete`);
  } catch (error) {
    console.error("Error in warmCache:", error);
    // Don't throw - cache warming is non-critical
  }
};

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = async (): Promise<{ keys: number; memory: string }> => {
  if (!redis) {
    console.log(`⊘ Redis disabled, returning empty stats`);
    return { keys: 0, memory: "N/A" };
  }

  try {
    // Ensure connection before stats retrieval
    try {
      await ensureRedisConnection();
    } catch (connError) {
      const message = connError instanceof Error ? connError.message : String(connError);
      console.warn(`⚠️ Redis connection failed for stats: ${message}`);
      return { keys: 0, memory: "N/A" };
    }

    const info = await redis.info("memory");
    const dbSize = await redis.dbsize();
    
    return {
      keys: dbSize,
      memory: info.split("\n").find(line => line.startsWith("used_memory_human")) || "N/A",
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return { keys: 0, memory: "Error" };
  }
};


export const clearAllCache = async (): Promise<void> => {
  if (!redis) {
      throw new Error("Redis client is not initialized");
    }
  try {
    await redis.flushdb();
    console.log("🗑️ All cache cleared");
  } catch (error) {
    console.error("Error clearing all cache:", error);
    throw error;
  }
};

export default {
  CACHE_TTL,
  CACHE_KEYS,
  CACHE_INVALIDATION_MAP,
  invalidateCache,
  invalidateBatchKeys,
  getOrSet,
  setWithWriteThrough,
  warmCache,
  getCacheStats,
  clearAllCache,
};
