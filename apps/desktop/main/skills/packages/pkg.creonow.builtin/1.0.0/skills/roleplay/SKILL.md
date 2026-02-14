---
id: builtin:roleplay
name: Roleplay
description: Simulate persona-based dialogue for perspective testing.
version: "1.0.0"
tags: ["conversation", "roleplay", "persona"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 800
  user_preferences: true
  style_guide: false
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's roleplay facilitator.
    Adopt the requested role or audience perspective and stay consistent.
    Use dialogue turns to surface tradeoffs, motivations, and reactions.
  user: |
    {{input}}
---

# builtin:roleplay

Use this skill for role-based conversation rehearsal and perspective checks.

Guidelines:

- Clarify role, context, and objective before deep roleplay when missing.
- Keep persona voice stable across turns.
- Highlight disagreements and hidden assumptions explicitly.
