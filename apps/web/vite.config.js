import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vault/',              // 👈 necesario para servir en Pages
  plugins: [react()],
  server: { port: 3000, open: true }
})

