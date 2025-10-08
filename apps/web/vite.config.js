import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { withBase } from '../../config/vite.base.mjs'

export default withBase(
  defineConfig(({ mode }) => ({
    base: '/vault/', // Es necesario para servir en Pages (GitHub Pages)
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['robots.txt'],
        workbox: {
          navigateFallback: '/vault/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              // Static assets (immutable): Cache First
              urlPattern: ({ request, sameOrigin, url }) =>
                sameOrigin && /\.(?:css|js|woff2?|ttf|otf)$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-v1',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Lightweight JSON APIs: Stale-While-Revalidate
              urlPattern: ({ request, url }) =>
                request.destination === '' && /\.json$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'json-swr-v1',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Exclude or bypass large dynamic 3D assets (e.g., models, HDRs, textures)
              urlPattern: ({ url }) => /\.(?:hdr|glb|gltf|ktx2|basis|bin)$/i.test(url.pathname),
              handler: 'NetworkOnly',
            },
          ],
        },
        manifest: {
          id: '/vault/',
          name: 'Vault – Matriz de Eisenhower',
          short_name: 'Vault',
          description: 'Matriz de Eisenhower con notas, filtros, atajos y PWA.',
          lang: 'es',
          start_url: '/vault/',
          scope: '/vault/',
          display: 'standalone',
          theme_color: '#0a0a15',
          background_color: '#0a0a15',
          categories: ['productivity', 'notes', 'task-management'],
          icons: [
            { src: '/vault/icons/Icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/vault/icons/Icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/vault/icons/Icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/vault/icons/Icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
      // Habilitar analizador solo cuando se corre con --mode analyze
      ...(mode === 'analyze'
        ? [
            visualizer({
              filename: 'dist/stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
    server: { port: 3000, open: true },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.js',
      include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      coverage: { reporter: ['text', 'html'], include: ['src/lib/**'] },
    },
  })),
)
