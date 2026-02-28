import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_URL = process.env.VITE_API_URL || "http://localhost:8001";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/join":     { target: API_URL, changeOrigin: true },
            "/modes":    { target: API_URL, changeOrigin: true },
            "/health":   { target: API_URL, changeOrigin: true },
            "/sessions": { target: API_URL, changeOrigin: true },
        },
    },
});