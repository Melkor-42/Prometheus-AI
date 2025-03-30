import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    outDir: 'prometheus-pear',
  },
  server: {
    // middlewareMode: true,
    // headers: {
    //   'Content-Type': 'application/javascript',
    // },
    fs: {
      strict: false
    }
  },
  optimizeDeps: {
    exclude: ['@holepunch/pear-js']
  }
})
