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

Goal

- Run ideation conversations and unblock creative direction.

Input

- User problem statement, draft concept, or open-ended direction request.

Output

- Multiple candidate idea branches with concrete next actions.

Constraints

- Offer alternatives instead of a single path.
- Ask one clarifying question when goals are ambiguous.
- Keep responses action-oriented and concise.
