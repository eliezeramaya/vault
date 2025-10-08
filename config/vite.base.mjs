import { defineConfig } from 'vite'

export const baseViteConfig = {
  server: { port: 3000, open: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
}

// withBase can wrap either a plain object config or a function returning a config
export function withBase(overrides = {}) {
  if (typeof overrides === 'function') {
    // Return a function config so Vite can pass env ({ command, mode })
    return defineConfig(({ command, mode }) => {
      const resolved = overrides({ command, mode }) || {}
      return {
        ...baseViteConfig,
        ...resolved,
        server: { ...(baseViteConfig.server || {}), ...(resolved.server || {}) },
        test: { ...(baseViteConfig.test || {}), ...(resolved.test || {}) },
      }
    })
  }
  // Regular object config
  return defineConfig({
    ...baseViteConfig,
    ...overrides,
    server: { ...(baseViteConfig.server || {}), ...(overrides.server || {}) },
    test: { ...(baseViteConfig.test || {}), ...(overrides.test || {}) },
  })
}
