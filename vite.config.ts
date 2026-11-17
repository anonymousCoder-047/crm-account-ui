import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to handle Windows file permission issues
const cleanBuildDir = () => {
  return {
    name: 'clean-build-dir',
    buildStart() {
      const buildDir = path.resolve(__dirname, 'build')
      if (fs.existsSync(buildDir)) {
        try {
          // Use fs.rmSync with retry options (Node.js 14.14.0+)
          // This handles Windows permission issues better
          fs.rmSync(buildDir, { 
            recursive: true, 
            force: true, 
            maxRetries: 5, 
            retryDelay: 200 
          })
        } catch (error: any) {
          // If cleanup fails, log warning but don't fail the build
          // Vite's emptyOutDir will try again, or we'll overwrite files
          console.warn(`Warning: Could not fully clean build directory: ${error.message}`)
          console.warn('Build will continue - some old files may remain.')
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Base path for hosting under a subpath (e.g. GitHub Pages at /<repo>/).
  // Set via VITE_BASE_PATH at build time; defaults to root for normal hosting.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), cleanBuildDir()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['decimal.js-light', '@rc-component/mini-decimal'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    host: true, // Allow access from network (mobile devices)
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
  build: {
    outDir: 'build', // change default output directory from dist -> build
    emptyOutDir: false, // Disable Vite's cleanup - our plugin handles it with better error handling
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})

