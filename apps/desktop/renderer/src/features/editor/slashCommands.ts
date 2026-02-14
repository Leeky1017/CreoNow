export type SlashCommandId =
  | "continueWriting"
  | "describe"
  | "dialogue"
  | "character"
  | "outline"
  | "search";

export interface SlashCommandDefinition {
  id: SlashCommandId;
  label: string;
  description: string;
  keywords: string[];
}

export const SLASH_COMMAND_REGISTRY: SlashCommandDefinition[] = [
  {
    id: "continueWriting",
    label: "/续写",
    description: "基于当前光标附近上下文继续创作。",
    keywords: ["续写", "continue", "write"],
  },
  {
    id: "describe",
    label: "/描写",
    description: "扩展场景细节与氛围描写。",
    keywords: ["描写", "description", "describe"],
  },
  {
    id: "dialogue",
    label: "/对白",
    description: "生成角色间自然对话。",
    keywords: ["对白", "dialogue", "conversation"],
  },
  {
    id: "character",
    label: "/角色",
    description: "补充角色设定与人物动机。",
    keywords: ["角色", "character", "persona"],
  },
  {
    id: "outline",
    label: "/大纲",
    description: "整理章节结构与叙事节奏。",
    keywords: ["大纲", "outline", "structure"],
  },
  {
    id: "search",
    label: "/搜索",
    description: "检索项目中的相关信息。",
    keywords: ["搜索", "search", "find"],
  },
];

export function filterSlashCommands(
  commands: SlashCommandDefinition[],
  query: string,
): SlashCommandDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return commands;
  }

  return commands.filter((command) => {
    if (command.label.toLowerCase().includes(normalized)) {
      return true;
    }
    if (command.description.toLowerCase().includes(normalized)) {
      return true;
    }
    return command.keywords.some((keyword) =>
      keyword.toLowerCase().includes(normalized),
    );
  });
}

export type SlashCommandExecutors = Partial<Record<SlashCommandId, () => void>>;

export function routeSlashCommandExecution(
  commandId: SlashCommandId,
  executors: SlashCommandExecutors,
): boolean {
  const executor = executors[commandId];
  if (!executor) {
    return false;
  }
  executor();
  return true;
}
