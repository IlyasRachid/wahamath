import { supabase } from '@/lib/supabase/client';

type CacheTag = 'exercises' | 'classes' | 'questions' | 'comments' | 'notifications' | 'reports' | 'profile' | 'enrollments';
type CacheEntry<T> = { data: T; expiresAt: number; tags: CacheTag[] };

const cache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const dirtyTags = new Set<CacheTag>();
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const storageKey = 'wahamath-api-cache-v1';
let hydratedForUserId: string | null = null;

type PersistedCache = {
  userId: string;
  entries: Array<[string, CacheEntry<unknown>]>;
};

function persistCache() {
  if (typeof window === 'undefined' || !hydratedForUserId) return;
  try {
    const payload: PersistedCache = { userId: hydratedForUserId, entries: Array.from(cache.entries()) };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Storage can be disabled or full. The in-memory cache still works.
  }
}

/** Restores the current user's navigation cache after a browser refresh. */
export function hydrateApiCache(userId: string) {
  if (typeof window === 'undefined' || hydratedForUserId === userId) return;

  cache.clear();
  dirtyTags.clear();
  hydratedForUserId = userId;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;
    const stored = JSON.parse(raw) as PersistedCache;
    if (stored.userId !== userId || !Array.isArray(stored.entries)) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }
    for (const [path, entry] of stored.entries) {
      if (typeof path === 'string' && entry && Array.isArray(entry.tags)) cache.set(path, entry);
    }
  } catch {
    window.sessionStorage.removeItem(storageKey);
  }
}

export function peekApiCache<T>(path: string): T | null {
  const entry = cache.get(path) as CacheEntry<T> | undefined;
  // Navigation cache is mutation-driven: keeping a tab fast is more useful
  // than refetching unchanged data after an arbitrary timeout. Dynamic areas
  // are invalidated by their polling/mutation paths instead.
  if (!entry || entry.tags.some((tag) => dirtyTags.has(tag))) return null;
  return entry.data;
}

/** Whether a cached value is absent, invalidated, or past its revalidation time. */
export function isApiCacheStale(path: string): boolean {
  const entry = cache.get(path);
  return !entry || entry.tags.some((tag) => dirtyTags.has(tag)) || entry.expiresAt <= Date.now();
}

export async function cachedApiGet<T>(path: string, staleTimeMs = 5 * 60_000, tags: CacheTag[] = []): Promise<T> {
  const cached = peekApiCache<T>(path);
  if (cached) return cached;

  const inFlight = inFlightRequests.get(path);
  if (inFlight) return inFlight as Promise<T>;

  const request = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Veuillez vous reconnecter.');
    const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? 'Impossible de charger les données.');
    tags.forEach((tag) => dirtyTags.delete(tag));
    cache.set(path, { data: payload, expiresAt: Date.now() + staleTimeMs, tags });
    persistCache();
    return payload as T;
  })();
  inFlightRequests.set(path, request);
  try {
    return await request;
  } finally {
    inFlightRequests.delete(path);
  }
}

/** Preloads the list data needed by every authenticated workspace page. */
export async function preloadAuthenticatedData(role: 'student' | 'teacher') {
  const dashboardRequests: Array<Promise<unknown>> = [
    cachedApiGet('/api/classes', 5 * 60_000, ['classes']),
    cachedApiGet('/api/exercises', 5 * 60_000, ['exercises']),
    cachedApiGet('/api/questions', 60_000, ['questions']),
  ];

  if (role === 'teacher') dashboardRequests.push(cachedApiGet('/api/moderation/reports', 5 * 60_000, ['reports']));
  await Promise.allSettled(dashboardRequests);

  const secondaryRequests: Array<Promise<unknown>> = role === 'student'
    ? [
      cachedApiGet('/api/notifications', 30_000, ['notifications']),
      cachedApiGet('/api/profile', 5 * 60_000, ['profile']),
    ]
    : [
      cachedApiGet('/api/admin/students/pending', 30_000, ['enrollments']),
      cachedApiGet('/api/profile', 5 * 60_000, ['profile']),
    ];
  await Promise.allSettled(secondaryRequests);

  // Keep the initial browse page fast without eagerly downloading every
  // exercise discussion. Further pages are loaded on demand.
  const exerciseList = await cachedApiGet<{ items: Array<{ id: string }> }>('/api/exercises', 5 * 60_000, ['exercises']);
  const firstPageRequests = exerciseList.items.slice(0, 5).flatMap((exercise) => [
    cachedApiGet(`/api/exercises/${exercise.id}`, 30_000, ['exercises']),
    cachedApiGet(`/api/exercises/${exercise.id}/comments`, 30_000, ['comments']),
  ]);
  await Promise.allSettled(firstPageRequests);
}

export function invalidateApiCache(path: string, tags: CacheTag[] = []) {
  cache.delete(path);
  tags.forEach((tag) => dirtyTags.add(tag));
  persistCache();
}

export function invalidateCacheTags(...tags: CacheTag[]) {
  tags.forEach((tag) => dirtyTags.add(tag));
  for (const [path, entry] of Array.from(cache.entries())) {
    if (entry.tags.some((tag) => dirtyTags.has(tag))) cache.delete(path);
  }
  persistCache();
}

export function clearApiCache() {
  cache.clear();
  inFlightRequests.clear();
  dirtyTags.clear();
  hydratedForUserId = null;
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(storageKey);
}
