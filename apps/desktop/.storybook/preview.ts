import type { Preview } from "@storybook/react-vite";
import "../renderer/src/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "creonow-dark",
      values: [
        { name: "creonow-dark", value: "#050505" },
      ],
    },
  },
};

export default preview;
