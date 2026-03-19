import { createClient, type RedisClientType } from "redis";
import { logError } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: RedisClientType | undefined;
  // eslint-disable-next-line no-var
  var redisConnectPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var redisUnavailableUntil: number | undefined;
  // eslint-disable-next-line no-var
  var memoryCache: Map<string, { value: unknown; expiresAt: number }> | undefined;
}

const MEMORY_CACHE_MAX_SIZE = 500;

function getMemoryCache(): Map<string, { value: unknown; expiresAt: number }> {
  if (!global.memoryCache) {
    global.memoryCache = new Map();
  }
  return global.memoryCache;
}

function memoryGet<T>(key: string): T | null {
  const cache = getMemoryCache();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlSeconds: number): void {
  const cache = getMemoryCache();
  if (cache.size >= MEMORY_CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryDelete(...keys: string[]): void {
  const cache = getMemoryCache();
  for (const key of keys) {
    cache.delete(key);
  }
}

function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? process.env.AZURE_REDIS_CONNECTION_STRING ?? null;
}

function markRedisUnavailable(error: unknown): void {
  logError("Redis disabled temporarily", error);
  global.redisUnavailableUntil = Date.now() + 60_000;
  global.redisConnectPromise = undefined;
  global.redisClient = undefined;
}

function getRedisClient(): RedisClientType | null {
  const url = getRedisUrl();
  if (!url) return null;
  if ((global.redisUnavailableUntil ?? 0) > Date.now()) return null;

  if (global.redisClient) return global.redisClient;

  const client = createClient({ url });
  client.on("error", (error) => {
    markRedisUnavailable(error);
  });
  global.redisClient = client;
  global.redisConnectPromise = client.connect().catch((error) => {
    markRedisUnavailable(error);
  });
  return client;
}

async function ensureRedisReady(client: RedisClientType): Promise<boolean> {
  if (client.isReady) return true;
  if (!global.redisConnectPromise) return false;
  await Promise.race([
    global.redisConnectPromise.catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 250)),
  ]);
  return client.isReady;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  // Try memory cache first (instant)
  const memResult = memoryGet<T>(key);
  if (memResult !== null) return memResult;

  const client = getRedisClient();
  if (!client) return null;
  if (!(await ensureRedisReady(client))) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    // Populate memory cache for faster subsequent reads
    memorySet(key, parsed, 15);
    return parsed;
  } catch (error) {
    markRedisUnavailable(error);
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  // Always set memory cache (instant)
  memorySet(key, value, Math.min(ttlSeconds, 30));

  const client = getRedisClient();
  if (!client) return;
  if (!(await ensureRedisReady(client))) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    markRedisUnavailable(error);
  }
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  // Always clear memory cache
  memoryDelete(...keys);

  const client = getRedisClient();
  if (!client || keys.length === 0) return;
  if (!(await ensureRedisReady(client))) return;
  try {
    await client.del(keys);
  } catch (error) {
    markRedisUnavailable(error);
  }
}

// Synchronous memory-only cache for ultra-fast paths
export function memoryCacheGet<T>(key: string): T | null {
  return memoryGet<T>(key);
}

export function memoryCacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  memorySet(key, value, ttlSeconds);
}
