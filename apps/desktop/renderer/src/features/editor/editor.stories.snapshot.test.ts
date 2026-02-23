import { composeStories } from "@storybook/react";

import { runStorySnapshotSuite } from "../../test-utils/storySnapshotHarness";

import * as toolbarStories from "./EditorToolbar.stories";
import * as writeButtonStories from "./WriteButton.stories";

const {
  Default: ToolbarDefault,
  FocusVisibleBold,
  ReducedMotionDefault,
  DarkModeDefault,
  NoEditor,
  WithFormattedContent,
} = composeStories(toolbarStories);
const {
  Visible: WriteButtonVisible,
  Disabled: WriteButtonDisabled,
  Running: WriteButtonRunning,
} = composeStories(writeButtonStories);

runStorySnapshotSuite({
  suite: "editor stories snapshots",
  scenarioId: "ED-TEST-01",
  testName: "should cover toolbar + write button story states",
  entries: [
    ["editor-toolbar-default", ToolbarDefault],
    ["editor-toolbar-formatted", WithFormattedContent],
    ["editor-toolbar-focus-visible", FocusVisibleBold],
    ["editor-toolbar-reduced-motion", ReducedMotionDefault],
    ["editor-toolbar-dark-mode", DarkModeDefault],
    ["editor-toolbar-no-editor", NoEditor],
    ["editor-write-button-visible", WriteButtonVisible],
    ["editor-write-button-disabled", WriteButtonDisabled],
    ["editor-write-button-running", WriteButtonRunning],
  ],
});
