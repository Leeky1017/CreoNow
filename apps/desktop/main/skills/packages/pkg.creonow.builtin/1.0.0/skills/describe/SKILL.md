---
id: builtin:describe
name: Describe
description: Enrich selected text with vivid sensory description.
version: "1.0.0"
tags: ["writing", "describe"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1000
  user_preferences: true
  style_guide: true
  characters: true
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are CreoNow's writing assistant.
    Expand sensory detail and imagery while preserving the original meaning,
    narrative role, and rhythm.
  user: |
    Rewrite the selected text with stronger descriptive detail.

    <text>
    {{input}}
    </text>
---

# builtin:describe

Goal
- Turn plain passages into vivid descriptions.

Input
- Selected text to describe in more detail.

Output
- A richer passage with concrete imagery and sensory cues.

Constraints
- Keep the original event sequence and perspective.
- Use details that fit the existing scene and tone.
- Do not introduce unrelated plot developments.
