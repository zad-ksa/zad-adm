import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // أي مجلد بناءٍ آخر عبر NEXT_BUILD_DIR.
    ".next-*/**",
  ]),
  {
    // سكربتات الصيانة والبذر تُشغَّل بـnode مباشرةً لا عبر الحزم، فهي CommonJS
    // و`require` فيها هو الطريق لا بديلَ له. والقاعدة موضوعةٌ لكود التطبيق.
    files: ["scripts/**/*.js", "prisma/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
