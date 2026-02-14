---
id: builtin:write
name: Write
description: Continue writing from the current cursor context.
version: "1.0.0"
tags: ["writing", "write"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1800
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
    Continue drafting from the provided context while preserving tone, pacing,
    and narrative constraints.
  user: |
    Continue writing the draft from the current cursor position.

    <input>
    {{input}}
    </input>
---

# builtin:write

Goal

- Continue the draft naturally from current context.

Input

- Current document context around the cursor.

Output

- One or more coherent continuation paragraphs.

Constraints

- Match established voice and tense.
- Do not contradict known facts or character settings.
- Avoid repeating recently written sentences.
