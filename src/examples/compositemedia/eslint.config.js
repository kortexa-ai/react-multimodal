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
                ...globals.es2021,
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
        files: ["**/*.{js,jsx}"],
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...pluginReactConfig.rules,
            "react/prop-types": "off",
        },
    },
    {
        ...pluginReactJsxRuntime,
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
        files: ["**/*.{js,jsx}"],
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },
];
