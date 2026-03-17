import { createClient, type RedisClientType } from "redis";
import { logError } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: RedisClientType | undefined;
  // eslint-disable-next-line no-var
  var redisConnectPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var redisUnavailableUntil: number | undefined;
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
  const client = getRedisClient();
  if (!client) return null;
  if (!(await ensureRedisReady(client))) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    markRedisUnavailable(error);
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
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
  const client = getRedisClient();
  if (!client || keys.length === 0) return;
  if (!(await ensureRedisReady(client))) return;
  try {
    await client.del(keys);
  } catch (error) {
    markRedisUnavailable(error);
  }
}
