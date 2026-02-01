import type { Preview } from "@storybook/react";

/**
 * 引入全局样式
 *
 * main.css 已包含：
 * - tokens.css: 设计系统变量（颜色、间距、圆角等）
 * - fonts.css: 字体配置
 * - Tailwind CSS 基础样式
 */
import "../renderer/src/styles/main.css";

/**
 * Storybook 全局配置
 *
 * - 默认使用暗色主题（data-theme="dark"）
 * - 提供主题切换工具栏
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
  },
  decorators: [
    (Story, context) => {
      // 根据 globals 中的主题设置 data-theme 属性
      const theme = context.globals.theme || "dark";
      document.documentElement.setAttribute("data-theme", theme);
      return (
        <div
          style={{
            backgroundColor: "var(--color-bg-base)",
            color: "var(--color-fg-default)",
            padding: "1rem",
            minHeight: "100vh",
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "dark",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "dark", icon: "moon", title: "Dark" },
          { value: "light", icon: "sun", title: "Light" },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
