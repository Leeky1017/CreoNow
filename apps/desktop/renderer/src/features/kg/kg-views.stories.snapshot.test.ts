import { render } from "@testing-library/react";
import { composeStories } from "@storybook/react";
import { describe, expect, it } from "vitest";

import * as stories from "./KgViews.stories";

const {
  GraphMultiNode,
  GraphMinimal,
  GraphEmpty,
  CharacterCardComplete,
  CharacterCardPartial,
  CharacterCardEmpty,
} = composeStories(stories);

describe("kg-views.stories snapshots", () => {
  it("should cover graph(3 states) and character-card(3 states) story snapshots", () => {
    const entries = [
      ["graph-multi-node", GraphMultiNode],
      ["graph-minimal", GraphMinimal],
      ["graph-empty", GraphEmpty],
      ["character-card-complete", CharacterCardComplete],
      ["character-card-partial", CharacterCardPartial],
      ["character-card-empty", CharacterCardEmpty],
    ] as const;

    for (const [name, Story] of entries) {
      const { container, unmount } = render(Story({}));
      expect(container.firstChild).toMatchSnapshot(name);
      unmount();
    }
  });
});
