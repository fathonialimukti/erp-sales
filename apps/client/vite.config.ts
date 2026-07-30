import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // ── Code-split aggressively for Lighthouse ──
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core in one chunk (cached forever)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          // TanStack in one chunk
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack';
          }
          // Motion + animation
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Icon libraries
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/@gravity-ui')) {
            return 'vendor-icons';
          }
          // Radix UI + shadcn
          if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui') || id.includes('node_modules/cmdk') || id.includes('node_modules/sonner') || id.includes('node_modules/input-otp') || id.includes('node_modules/react-day-picker')) {
            return 'vendor-radix';
          }
          // tRPC + TanStack Query
          if (id.includes('node_modules/@trpc')) {
            return 'vendor-trpc';
          }
          // Tauri
          if (id.includes('node_modules/@tauri-apps')) {
            return 'vendor-tauri';
          }
          // AI SDK
          if (id.includes('node_modules/ai') || id.includes('node_modules/@ai-sdk') || id.includes('node_modules/@vercel/ai')) {
            return 'vendor-ai';
          }
          // recharts
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
        },
      },
    },
    // Warn if any chunk exceeds 500kB
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    // Optimize for Tauri production builds
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 10021,
    strictPort: true,
    // Allow proxied hosts (e.g. served via Nginx Proxy Manager) instead of only localhost.
    allowedHosts: true,
    host: host || '0.0.0.0',
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 10021,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
