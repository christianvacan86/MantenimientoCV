import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite que se escuche fuera de localhost
    strictPort: true,
    allowedHosts: ['cvaca.zaimella.com'] // Permite tu dominio personalizado
  }
})
