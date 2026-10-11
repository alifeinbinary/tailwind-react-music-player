import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const getBase = (command: 'build' | 'serve') => {
  if (process.env.NETLIFY || process.env.SURGE || command === 'serve') {
    return '/'
  }
  return '/react-music-player/'
}

export default defineConfig(({ command }) => ({
  plugins: [react({ jsxRuntime: 'classic' }), tailwindcss()],
  base: getBase(command),
  optimizeDeps: {
    exclude: ['react/jsx-dev-runtime', 'react/jsx-runtime'],
  },
  server: {
    host: 'localhost',
    port: 8084,
    open: true,
  },
}))
