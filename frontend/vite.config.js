import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Ez kell, hogy a Dockerből elérhető legyen
    port: 5173,
    watch: {
      usePolling: true, // Ez segít, hogy Windows-on rögtön frissüljön a kód, ha átírsz valamit
    },
  },
})