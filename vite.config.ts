import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/ip-numbering-plan/',
  plugins: [react(), tailwindcss()],
})
