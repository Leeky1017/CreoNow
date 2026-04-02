import type { Preview } from "@storybook/react";

import "../renderer/src/i18n/config";
import "../renderer/src/styles/index.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="sb-preview-frame dark" style={{ padding: "24px" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
