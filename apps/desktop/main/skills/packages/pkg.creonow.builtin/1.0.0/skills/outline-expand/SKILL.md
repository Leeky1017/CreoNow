---
id: outline-expand
name: 大纲展开
description: 将大纲要点展开为完整段落或章节
version: "1.0.0"
tags: ["generation", "outline", "p3"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
inputType: selection
outputType: new-content
permissionLevel: preview-confirm
context_rules:
  surrounding: 1200
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    你是 CreoNow 的长篇创作助手。请把大纲要点扩写为连贯的中文叙事，并保持项目设定一致。
    只返回 JSON，不要附加解释。
  user: |
    请基于以下大纲生成扩写结果，返回 JSON：
    {
      "expandedContent": "string",
      "paragraphCount": number
    }

    <input>
    {{input}}
    </input>
---

# outline-expand

用于把当前选区中的大纲要点扩写为正文草稿。运行时通过标准技能执行链获得上下文。
