/**
 * Vitest 全局设置文件
 *
 * 在每个测试文件执行前自动运行，用于：
 * - 扩展 expect 断言（@testing-library/jest-dom）
 * - 配置全局 Mock
 * - 设置测试环境
 */
import "@testing-library/jest-dom/vitest";

/**
 * 清理 DOM
 *
 * 每个测试后自动清理 DOM，确保测试隔离
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
