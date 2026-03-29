import type { Preview } from '@storybook/react';
import React from 'react';
import '../renderer/src/i18n/config';
import '../renderer/src/styles/index.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-6 font-[var(--font-ui)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#050505' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
