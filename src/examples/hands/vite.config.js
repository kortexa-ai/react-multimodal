import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "./dist",
        chunkSizeWarningLimit: 2500,
        assetsInlineLimit: 0,
        rollupOptions: {
            external: [],
            output: {
                manualChunks: {
                    "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
                    "three-core": ["three"],
                },
            },
        },
        sourcemap: true,
        emptyOutDir: true,
    },
});
