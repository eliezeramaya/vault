import { describe, it, expect, beforeEach } from 'vitest'
import { getSafeStorage, safeSet, safeGet } from './safeStorage'

// We simulate an environment where localStorage.setItem throws to ensure fallback.

function mockFailingLocalStorage() {
  const orig = globalThis.localStorage
  const failing = {
    getItem: (_k: string) => null,
    setItem: (_k: string, _v: string) => {
      throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' })
    },
    removeItem: (_k: string) => {
      throw new Error('QuotaExceededError')
    },
    clear: () => {
      throw new Error('QuotaExceededError')
    },
    key: (_i: number) => null,
    length: 0,
  } as any
  Object.defineProperty(globalThis, 'localStorage', { value: failing, configurable: true })
  return () => {
    Object.defineProperty(globalThis, 'localStorage', { value: orig, configurable: true })
  }
}

describe('safeStorage fallback', () => {
  let restore: (() => void) | null = null
  beforeEach(() => {
    if (restore) restore()
    restore = mockFailingLocalStorage()
  })
  it('falls back to memory store and sets flags', () => {
    const store = getSafeStorage()
    // Should be memory-backed (__memory true) and not throw on set
    safeSet('x_test', { a: 1 })
    expect(safeGet('x_test')?.a).toBe(1)
    expect((store as any).__memory).toBe(true)
    expect((globalThis as any).__STORAGE_OK__).toBe(false)
    expect((globalThis as any).__PRIVATE_MODE__).toBe(true)
  })
})
