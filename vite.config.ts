import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules/three/')) return 'three'; if (id.includes('node_modules/postprocessing/')) return 'postprocessing' } } },
  },
})
