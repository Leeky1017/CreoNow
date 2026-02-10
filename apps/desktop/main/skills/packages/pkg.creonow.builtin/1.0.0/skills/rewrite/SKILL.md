---
id: builtin:rewrite
name: Rewrite
description: Rewrite selected text following explicit instructions.
version: "1.0.0"
tags: ["writing", "rewrite"]
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
    Rewrite the input while preserving meaning and factual claims.
    Follow all explicit rewrite instructions from the input.
  user: |
    Rewrite the following text according to the user's instruction.

    <input>
    {{input}}
    </input>
---

# builtin:rewrite

Use this skill to rewrite selected text while keeping context coherence.
