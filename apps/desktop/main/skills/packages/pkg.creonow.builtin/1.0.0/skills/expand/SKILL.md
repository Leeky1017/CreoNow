---
id: builtin:expand
name: Expand
description: Expand selected text with richer details.
version: "1.0.0"
tags: ["writing", "expand"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1000
  user_preferences: true
  style_guide: true
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are CreoNow's writing assistant.
    Expand the text with concrete details while preserving original structure and pace.
  user: |
    Expand the following text.

    <text>
    {{input}}
    </text>
---

# builtin:expand

Use this skill to add detail without changing core intent.
