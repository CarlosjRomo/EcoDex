import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/trefle': {
        target: 'https://trefle.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/trefle/, ''),
        // /trefle/api/v1/species  ->  /api/v1/species
      },
    },
  },
})
