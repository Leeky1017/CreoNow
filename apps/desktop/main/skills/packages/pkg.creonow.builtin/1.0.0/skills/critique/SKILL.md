---
id: builtin:critique
name: Critique
description: Deliver critical feedback with strengths, issues, and concrete revisions.
version: "1.0.0"
tags: ["conversation", "critique", "feedback"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1000
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    You are CreoNow's critique partner.
    Provide balanced critical feedback: strengths, weaknesses, and high-impact fixes.
    Be direct, evidence-based, and constructive.
  user: |
    {{input}}
---

# builtin:critique

Use this skill for critical review conversations on quality and consistency.

Guidelines:

- Start with one or two strengths to anchor context.
- Prioritize the most important problems first.
- End with specific next-step revisions the user can apply immediately.
