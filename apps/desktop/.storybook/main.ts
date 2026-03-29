import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../renderer/src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    const path = await import('path');
    const tailwindcss = await import('@tailwindcss/vite');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../renderer/src'),
    };
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss.default());
    return config;
  },
};

export default config;
