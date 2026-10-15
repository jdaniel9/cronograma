import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base = nombre de tu repositorio en GitHub, con barras
export default defineConfig({ plugins: [react()], base: '/cronograma/', test: { environment: 'node' } })
