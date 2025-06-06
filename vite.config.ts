import path from "node:path";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react-swc";

import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
        }),
        react(),
    ],
    optimizeDeps: {
        esbuildOptions: {
            tsconfig: "./tsconfig.app.json",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: "./dist",
        chunkSizeWarningLimit: 2500,
        assetsInlineLimit: 0,
        lib: {
            entry: path.resolve(__dirname, "./src/index.ts"),
            name: "@kortexa-ai/react-multimodal",
            formats: ["es"],
        },
        rollupOptions: {
            external: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "@mediapipe/hands",
                "@mediapipe/tasks-audio",
                "@mediapipe/tasks-vision",
            ],
            output: {
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                    "react/jsx-runtime": "jsxRuntime",
                    "@mediapipe/hands": "mediapipeHands",
                    "@mediapipe/tasks-audio": "mediapipeTasksAudio",
                    "@mediapipe/tasks-vision": "mediapipeTasksVision",
                },
            },
        },
        sourcemap: true,
        emptyOutDir: true,
    },
});
