---
id: builtin:chat
name: Chat
description: Free-form conversation with your AI writing partner.
version: "1.0.0"
tags: ["writing", "chat", "dialogue"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 400
  user_preferences: true
  style_guide: false
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    与创作者对话，回答写作相关问题。
    如果用户意图不明确，先追问澄清，不要猜测。
    保持简洁、有洞察力的回应。
  user: |
    {{input}}
---

# builtin:chat

Use this skill for free-form conversation, questions, brainstorming requests,
and any input that does not map to a specific text-transformation skill.

Guidelines:

- Answer writing-related questions with concrete examples.
- If the user's intent is ambiguous, ask a clarifying question.
- Keep responses concise and actionable.
