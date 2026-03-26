---
id: builtin:dialogue
name: Dialogue
description: Rewrite selected text into character dialogue lines.
version: "1.0.0"
tags: ["writing", "dialogue"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1200
  user_preferences: true
  style_guide: true
  characters: true
  outline: false
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
    Convert prose into natural dialogue that reflects speaker intent,
    character voice, and scene context.
  user: |
    Rewrite the selected content as dialogue.

    <text>
    {{input}}
    </text>
---

# builtin:dialogue

Goal

- Transform narrative text into effective spoken dialogue.

Input

- Selected text describing a scene, action, or intent.

Output

- Dialogue-first rewrite with clear speaker turns.

Constraints

- Keep speakers consistent with character context.
- Preserve the original intent and key information.
- Keep dialogue concise and avoid exposition dumps.
