// safeStorage.ts - robust wrapper around localStorage with in-memory fallback.
// Handles private/incognito modes where setItem may throw (Safari) or storage is disabled.

interface SafeLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  __memory?: boolean
}

const memoryStore = (): SafeLike => {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
    __memory: true,
  }
}

export function detectStorageAvailable(): { ok: boolean; reason?: string } {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window))
      return { ok: false, reason: 'no-window' }
    const testKey = '__ss_probe__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: (e && e.name) || 'error' }
  }
}

let cached: SafeLike | null = null

export function getSafeStorage(): SafeLike {
  if (cached) return cached
  const det = detectStorageAvailable()
  if (det.ok) {
    cached = window.localStorage as SafeLike
  } else {
    cached = memoryStore()
    ;(window as any).__PRIVATE_MODE__ = true
  }
  ;(window as any).__STORAGE_OK__ = det.ok
  return cached
}

export function safeGet<T = any>(key: string, def: T | null = null): T | null {
  try {
    const store = getSafeStorage()
    const raw = store.getItem(key)
    if (raw === null) return def
    return JSON.parse(raw) as T
  } catch {
    return def
  }
}

export function safeSet(key: string, value: any) {
  try {
    const store = getSafeStorage()
    store.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function safeRemove(key: string) {
  try {
    getSafeStorage().removeItem(key)
  } catch {}
}

export function safeStringGet(key: string, def: string | null = null): string | null {
  try {
    const store = getSafeStorage()
    const raw = store.getItem(key)
    return raw === null ? def : raw
  } catch {
    return def
  }
}

export function safeStringSet(key: string, value: string) {
  try {
    getSafeStorage().setItem(key, value)
  } catch {}
}

// Hook helper (minimal, avoids extra dependency)
export function useSafeString(key: string, def: string) {
  // Intentionally not importing React here; hook can be created if needed in a React file.
  throw new Error('useSafeString should be implemented in a React environment if needed.')
}
