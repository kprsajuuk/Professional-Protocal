import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发期前端通过 /api 前缀访问后端，由 Vite 代理到后端服务（默认 3000 端口）。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
