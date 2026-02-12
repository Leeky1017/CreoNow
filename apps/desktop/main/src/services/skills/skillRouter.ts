/**
 * Infer target skill from user input and context using keyword + heuristic rules.
 *
 * Priority:
 * 1. Explicit skill override (user manually selected)
 * 2. Keyword matching (Chinese/English keywords → skill mapping)
 * 3. Context heuristics (selection state → skill)
 * 4. Default: chat
 *
 * Design reference: audit/01 §3.4 — intent routing best practices.
 */

type InferSkillArgs = {
  input: string;
  hasSelection: boolean;
  explicitSkillId?: string;
};

const KEYWORD_RULES: ReadonlyArray<{
  keywords: readonly string[];
  skillId: string;
}> = [
  {
    keywords: ["续写", "写下去", "接着写", "继续写", "continue writing"],
    skillId: "builtin:continue",
  },
  {
    keywords: ["头脑风暴", "帮我想想", "brainstorm", "想一些"],
    skillId: "builtin:brainstorm",
  },
  {
    keywords: ["大纲", "提纲", "outline"],
    skillId: "builtin:outline",
  },
  {
    keywords: ["总结", "摘要", "summarize", "summary"],
    skillId: "builtin:summarize",
  },
  {
    keywords: ["翻译", "translate"],
    skillId: "builtin:translate",
  },
  {
    keywords: ["扩写", "展开", "expand"],
    skillId: "builtin:expand",
  },
  {
    keywords: ["缩写", "精简", "condense"],
    skillId: "builtin:condense",
  },
];

const REWRITE_KEYWORDS: readonly string[] = [
  "改", "重写", "改写", "rewrite", "修改",
];

export function inferSkillFromInput(args: InferSkillArgs): string {
  // 1. Explicit override
  if (args.explicitSkillId?.trim()) {
    return args.explicitSkillId;
  }

  const input = args.input.trim();

  // 2. Selection context heuristics
  if (args.hasSelection) {
    if (input.length === 0) {
      return "builtin:polish";
    }

    const isRewriteIntent = REWRITE_KEYWORDS.some((kw) => input.includes(kw));
    if (isRewriteIntent && input.length < 20) {
      return "builtin:rewrite";
    }
  }

  // 3. Keyword matching
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => input.includes(kw))) {
      return rule.skillId;
    }
  }

  // 4. Default
  return "builtin:chat";
}
