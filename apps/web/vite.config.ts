import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { withBase } from '../../config/vite.base.mjs'

export default withBase(
  defineConfig(({ command, mode }) => ({
    // Use '/' during dev to avoid broken dynamic imports like '/vault/src/...'
    // and '/vault/' for build/preview (GitHub Pages at /vault/)
    base: command === 'serve' ? '/' : '/vault/',
    plugins: [
      react(),
      splitVendorChunkPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['robots.txt'],
        workbox: {
          navigateFallback: '/vault/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
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
          icons: [
            { src: '/vault/icons/Icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/vault/icons/Icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
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
    server: { host: true, port: 3000, strictPort: true, open: false },
    preview: { host: true, port: 4173, strictPort: true, open: false },
    build: {
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('/react/')) return 'react'
              if (id.includes('three') || id.includes('framer-motion')) return 'viz'
              // shadcn/ui would be grouped here if present
              if (id.includes('@radix-ui') || id.includes('class-variance-authority')) return 'ui'
              return 'vendor'
            }
            return undefined
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entry/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.js',
      include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      coverage: { reporter: ['text', 'html'], include: ['src/lib/**'] },
    },
  }))
)
