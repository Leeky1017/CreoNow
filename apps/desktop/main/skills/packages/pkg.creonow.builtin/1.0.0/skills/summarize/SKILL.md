---
id: builtin:summarize
name: Summarize
description: Summarize selected text or chapter content.
version: "1.0.0"
tags: ["writing", "summary"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1200
  user_preferences: true
  style_guide: false
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
    Produce concise summaries covering key events and critical information.
  user: |
    Summarize the following content.

    <content>
    {{input}}
    </content>
---

# builtin:summarize

Use this skill to produce concise chapter or selection summaries.
