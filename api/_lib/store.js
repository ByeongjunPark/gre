const INDEX_KEY = 'gre:attempts';
const itemKey = (id) => `gre:attempt:${id}`;

let redis = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (!redis) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({ url, token });
  }
  return redis;
}

const memory = { items: new Map() };

function createStore() {
  const r = getRedis();
  if (r) return redisStore(r);
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const err = new Error('Redis 저장소가 연결되지 않았습니다. Vercel 프로젝트에 Upstash Redis를 연결하세요.');
    err.status = 500;
    err.expose = true;
    throw err;
  }
  return memoryStore();
}

function redisStore(r) {
  return {
    async list() {
      const ids = await r.zrange(INDEX_KEY, 0, -1, { rev: true });
      if (!ids.length) return [];
      const items = await r.mget(...ids.map(itemKey));
      return items.filter(Boolean);
    },
    async get(id) {
      return (await r.get(itemKey(id))) || null;
    },
    async put(rec) {
      await r.set(itemKey(rec.id), rec);
      await r.zadd(INDEX_KEY, { score: rec.timestamp, member: rec.id });
    },
    async del(id) {
      const removed = await r.del(itemKey(id));
      await r.zrem(INDEX_KEY, id);
      return removed > 0;
    },
    async clear() {
      const ids = await r.zrange(INDEX_KEY, 0, -1);
      if (ids.length) await r.del(...ids.map(itemKey));
      await r.del(INDEX_KEY);
      return ids.length;
    },
  };
}

function memoryStore() {
  const m = memory.items;
  return {
    async list() {
      return [...m.values()].sort((a, b) => b.timestamp - a.timestamp);
    },
    async get(id) {
      return m.get(id) || null;
    },
    async put(rec) {
      m.set(rec.id, rec);
    },
    async del(id) {
      return m.delete(id);
    },
    async clear() {
      const n = m.size;
      m.clear();
      return n;
    },
  };
}

module.exports = { createStore };
