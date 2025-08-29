// ESLint flat config for ESLint v9+
import js from "@eslint/js";

export default [
  {
    ignores: [
      "dist/**",
      "android/**",
      "**/*.min.js",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "after-used", ignoreRestSiblings: true }],
      "no-undef": "error",
    },
  },
];

