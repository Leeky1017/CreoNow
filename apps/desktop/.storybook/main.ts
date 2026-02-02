import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * Storybook 配置
 *
 * 使用 @storybook/react-vite 框架，与 electron-vite 的 renderer 配置保持一致。
 * Stories 文件与组件放在同一目录，便于维护。
 */
const config: StorybookConfig = {
  stories: [
    "../renderer/src/**/*.mdx",
    "../renderer/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {},
  /**
   * 自定义 Vite 配置
   *
   * 为 Storybook 添加 Tailwind CSS 插件，与 renderer 构建保持一致。
   */
  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      server: {
        allowedHosts: true, // Allow any host for tunnel access
      },
    });
  },
};

export default config;
