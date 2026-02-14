export type EditorSkillShortcutAction = "continueWriting" | "polish";

export type EditorSkillShortcutExecutors = {
  continueWriting: () => void;
  polish: () => void;
};

export type ShortcutDispatchResult = {
  matched: boolean;
  action: EditorSkillShortcutAction | null;
};

type ShortcutInput = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey"
>;

type ShortcutDefinition = {
  action: EditorSkillShortcutAction;
  key: string;
  shiftKey: boolean;
};

export const EDITOR_SKILL_SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    action: "continueWriting",
    key: "enter",
    shiftKey: false,
  },
  {
    action: "polish",
    key: "r",
    shiftKey: true,
  },
] as const;

function resolveShortcutAction(
  input: ShortcutInput,
): EditorSkillShortcutAction | null {
  const hasModifier = input.ctrlKey || input.metaKey;
  if (!hasModifier) {
    return null;
  }

  const normalizedKey = input.key.toLowerCase();
  for (const shortcut of EDITOR_SKILL_SHORTCUTS) {
    if (
      shortcut.key === normalizedKey &&
      shortcut.shiftKey === input.shiftKey
    ) {
      return shortcut.action;
    }
  }

  return null;
}

export function dispatchEditorSkillShortcut(
  input: ShortcutInput,
  executors: EditorSkillShortcutExecutors,
): ShortcutDispatchResult {
  const action = resolveShortcutAction(input);
  if (action === null) {
    return {
      matched: false,
      action: null,
    };
  }

  executors[action]();
  return {
    matched: true,
    action,
  };
}
