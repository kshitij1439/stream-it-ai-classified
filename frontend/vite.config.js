import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/join": "http://localhost:8001",
            "/modes": "http://localhost:8001",
            "/health": "http://localhost:8001",
            "/sessions": "http://localhost:8000",
        },
    },
});
