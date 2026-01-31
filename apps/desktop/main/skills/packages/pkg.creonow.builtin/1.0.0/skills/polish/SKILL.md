---
id: builtin:polish
name: Polish
description: Improve clarity and flow while preserving meaning.
version: "1.0.0"
tags: ["writing", "polish"]
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
    Follow the user's intent exactly. Preserve meaning and factual claims.
    Do not add new information.
  user: |
    Polish the following text for clarity and style.

    <text>
    {{input}}
    </text>
---

# builtin:polish

Use this skill to polish a selected paragraph or a short section.

Guidelines:
- Preserve meaning and factual claims.
- Keep the author's voice.
- Fix grammar, punctuation, and awkward phrasing.

