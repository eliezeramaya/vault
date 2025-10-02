import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/vault/',              // Es necesario para servir en Pages (GitHub Pages)
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        navigateFallback: '/vault/index.html',
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
          { src: 'icons/Icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/Icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/Icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/Icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: { port: 3000, open: true }
})

