import axios from 'axios';

interface CachedSession {
  userId: string;
  email: string;
  cachedAt: number;
}

// token → session, TTL 1 hour
const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CachedSession>();

export async function resolveUserId(token: string): Promise<{ userId: string; email: string }> {
  const cached = cache.get(token);
  if (cached && Date.now() - cached.cachedAt < TTL_MS) {
    return { userId: cached.userId, email: cached.email };
  }

  const res = await axios.get<{ id: string; email: string }>('https://api.airtable.com/v0/meta/whoami', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const entry: CachedSession = {
    userId: res.data.id,
    email: res.data.email,
    cachedAt: Date.now(),
  };
  cache.set(token, entry);

  return { userId: entry.userId, email: entry.email };
}
