---
id: builtin:continue
name: Continue
description: Continue writing from current document context.
version: "1.0.0"
tags: ["writing", "continue"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1600
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
    Continue writing from provided context, matching style and narrative constraints.
  user: |
    Continue the draft based on current context and constraints.

    <input>
    {{input}}
    </input>
---

# builtin:continue

Use this skill to continue the current chapter from the cursor position.
