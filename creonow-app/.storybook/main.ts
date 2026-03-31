import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = resolve(projectRoot, "src");

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
  viteFinal: async (config) => {
    // WSL2: Vite HMR WebSocket must connect to 'localhost' (not '0.0.0.0')
    // so Windows browser can reach it via WSL2 localhost forwarding
    config.server = {
      ...config.server,
      hmr: {
        ...((config.server?.hmr && typeof config.server.hmr === "object")
          ? config.server.hmr
          : {}),
        host: "localhost",
      },
    };

    config.root = projectRoot;
    const existingAlias = config.resolve?.alias;
    const alias = Array.isArray(existingAlias)
      ? [...existingAlias, { find: "@", replacement: srcRoot }]
      : { ...(existingAlias ?? {}), "@": srcRoot };
    config.resolve = {
      ...config.resolve,
      alias,
    };

    return config;
  },
};

export default config;
