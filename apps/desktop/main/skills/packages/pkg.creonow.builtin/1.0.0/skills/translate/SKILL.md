---
id: builtin:translate
name: Translate
description: Translate selected text while preserving literary quality.
version: "1.0.0"
tags: ["writing", "translate"]
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
    Translate naturally and preserve tone; avoid literal word-by-word translation.
  user: |
    Translate the following text.

    <text>
    {{input}}
    </text>
---

# builtin:translate

Use this skill to translate selected text with literary fidelity.
