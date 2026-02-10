---
id: builtin:condense
name: Condense
description: Condense selected text to concise form.
version: "1.0.0"
tags: ["writing", "condense"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 800
  user_preferences: true
  style_guide: true
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are CreoNow's writing assistant.
    Condense text while preserving key facts and narrative intent.
  user: |
    Condense the following text.

    <text>
    {{input}}
    </text>
---

# builtin:condense

Use this skill to keep only core information and remove redundancy.
