---
id: builtin:shrink
name: Shrink
description: Compress selected text while keeping core information.
version: "1.0.0"
tags: ["writing", "shrink"]
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
    Condense the text to a tighter form without losing key facts or intent.
  user: |
    Shorten the following text while keeping its core meaning.

    <text>
    {{input}}
    </text>
---

# builtin:shrink

Goal
- Reduce length while preserving essential meaning.

Input
- Selected text that needs to be shorter.

Output
- A concise rewrite with less redundancy.

Constraints
- Keep important facts, actions, and causal links.
- Remove filler and repeated phrasing first.
- Do not change narrative point of view.
