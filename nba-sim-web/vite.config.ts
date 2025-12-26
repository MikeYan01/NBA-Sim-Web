import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use '/' for local dev, '/NBA-Sim-Web/' for production build
  base: command === 'serve' ? '/' : '/NBA-Sim-Web/',
}))
