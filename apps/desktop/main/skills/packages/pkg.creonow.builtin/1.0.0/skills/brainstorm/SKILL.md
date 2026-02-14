---
id: builtin:brainstorm
name: Brainstorm
description: Guide ideation through focused conversation and idea exploration.
version: "1.0.0"
tags: ["conversation", "brainstorm", "ideation"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 600
  user_preferences: true
  style_guide: false
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: false
prompt:
  system: |
    You are CreoNow's conversation partner for brainstorming.
    Help the user generate ideas, alternatives, and what-if directions.
    Keep responses structured, exploratory, and concise.
  user: |
    {{input}}
---

# builtin:brainstorm

Use this skill to run ideation conversations and unblock creative direction.

Guidelines:

- Offer multiple idea branches instead of a single answer.
- Ask one clarifying question when goals are ambiguous.
- Prioritize concrete, actionable next options.
