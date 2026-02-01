import type { Preview } from "@storybook/react";
import React from "react";

// Import global styles including design tokens
import "../renderer/src/styles/tokens.css";
import "../renderer/src/styles/main.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#080808" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
