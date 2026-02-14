import { Extension } from "@tiptap/react";

export interface SlashCommandOptions {
  isPanelOpen: () => boolean;
  onOpenPanel: () => void;
  onClosePanel: () => void;
}

const DEFAULT_OPTIONS: SlashCommandOptions = {
  isPanelOpen: () => false,
  onOpenPanel: () => undefined,
  onClosePanel: () => undefined,
};

/**
 * Slash command trigger/close framework.
 *
 * This extension only controls panel visibility contract for `/` + `Escape`.
 * Concrete command registration/execution belongs to a follow-up change.
 */
export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return DEFAULT_OPTIONS;
  },

  addKeyboardShortcuts() {
    return {
      "/": () => {
        this.options.onOpenPanel();
        return false;
      },
      Escape: () => {
        if (!this.options.isPanelOpen()) {
          return false;
        }
        this.options.onClosePanel();
        return true;
      },
    };
  },
});
