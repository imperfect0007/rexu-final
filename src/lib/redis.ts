import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let initFailed = false;

function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\r/g, '').replace(/\\n/g, '').trim();
}

export function getRedis(): Redis | null {
  if (initFailed) return null;

  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;

  if (!redis) {
    try {
      redis = new Redis({ url, token });
    } catch (err) {
      initFailed = true;
      console.error('Upstash Redis init failed:', err);
      return null;
    }
  }

  return redis;
}
