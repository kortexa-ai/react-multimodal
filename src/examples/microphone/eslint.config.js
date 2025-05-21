// eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import pluginReactJsxRuntime from "eslint-plugin-react/configs/jsx-runtime.js";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021, // Or a newer ES version if you prefer
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
    },
    pluginJs.configs.recommended,
    {
        ...pluginReactConfig,
        files: ["**/*.{js,jsx}"], // Apply React rules to JS and JSX files
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...pluginReactConfig.rules,
            "react/prop-types": "off", // Often turned off for JS examples or when using TS
        },
    },
    {
        ...pluginReactJsxRuntime, // Handles new JSX transform without needing React in scope
        files: ["**/*.{js,jsx}"],
    },
    {
        plugins: {
            "react-hooks": pluginReactHooks,
        },
        rules: pluginReactHooks.configs.recommended.rules,
        files: ["**/*.{js,jsx}"],
    },
    {
        // Your custom rules or overrides
        files: ["**/*.{js,jsx}"],
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            // Add any other specific rules you want
        },
    },
];
