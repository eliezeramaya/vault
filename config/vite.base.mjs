import { defineConfig } from 'vite'

export const baseViteConfig = {
  server: { port: 3000, open: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
}

export function withBase(overrides = {}) {
  return defineConfig({
    ...baseViteConfig,
    ...overrides,
    server: { ...(baseViteConfig.server||{}), ...(overrides.server||{}) },
    test: { ...(baseViteConfig.test||{}), ...(overrides.test||{}) },
  })
}
