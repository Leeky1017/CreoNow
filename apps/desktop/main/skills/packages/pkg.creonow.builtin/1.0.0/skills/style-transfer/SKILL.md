---
id: builtin:style-transfer
name: Style Transfer
description: Transfer selected text to a target writing style.
version: "1.0.0"
tags: ["writing", "style"]
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
    Keep narrative content unchanged and only transform language style.
  user: |
    Rewrite the text in the requested target style.

    <input>
    {{input}}
    </input>
---

# builtin:style-transfer

Use this skill to rewrite tone and diction without changing story facts.
