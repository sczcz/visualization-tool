import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];


export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Disable unused variables rule
      '@typescript-eslint/no-explicit-any': 'off', // Allow the use of 'any'
      '@typescript-eslint/no-empty-object-type': 'off', // Allow empty object types
      'react-hooks/exhaustive-deps': 'off', // Disable React hook dependency warnings
      'prefer-const': 'off', // Allow 'let' even if variables are not reassigned
    },
  },
];