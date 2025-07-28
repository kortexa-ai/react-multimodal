import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: "/react-multimodal/",
    build: {
        outDir: "../../../docs",
        emptyOutDir: true,
        chunkSizeWarningLimit: 2500,
        assetsInlineLimit: 0,
        rollupOptions: {
            output: {
                manualChunks: {
                    "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
                    "three-core": ["three"],
                },
            },
        },
    },
});
