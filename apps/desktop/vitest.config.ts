import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest 配置
 *
 * - 使用 jsdom 环境模拟浏览器环境
 * - 集成 @testing-library/jest-dom 扩展断言
 * - 配置覆盖率报告
 * - 测试文件位于组件同目录，命名为 *.test.tsx
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared"),
    },
  },
  test: {
    /**
     * 测试环境配置
     *
     * jsdom: 模拟浏览器 DOM 环境，支持 React 组件测试
     */
    environment: "jsdom",

    /**
     * 全局设置文件
     *
     * 在每个测试文件执行前自动引入，
     * 包含 @testing-library/jest-dom 的扩展断言
     */
    setupFiles: ["./vitest.setup.ts"],

    /**
     * 测试文件匹配模式
     *
     * 查找 renderer/src 目录下的所有 .test.ts 和 .test.tsx 文件
     */
    include: ["renderer/src/**/*.test.{ts,tsx}"],

    /**
     * 排除模式
     *
     * 排除 node_modules 和 dist 目录
     */
    exclude: ["**/node_modules/**", "**/dist/**"],

    /**
     * 启用全局 API
     *
     * 允许在测试中直接使用 describe、it、expect 等，无需导入
     */
    globals: true,

    /**
     * 覆盖率配置
     */
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["renderer/src/**/*.{ts,tsx}"],
      exclude: [
        "renderer/src/**/*.stories.{ts,tsx}",
        "renderer/src/**/*.test.{ts,tsx}",
        "renderer/src/main.tsx",
        "renderer/src/global.d.ts",
      ],
      thresholds: {
        statements: 60,
        branches: 58,
        functions: 60,
        lines: 60,
      },
    },

    /**
     * CSS 配置
     *
     * 启用 CSS 模块支持
     */
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
});
