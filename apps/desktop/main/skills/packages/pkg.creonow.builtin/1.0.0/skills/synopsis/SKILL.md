---
id: builtin:synopsis
name: Synopsis
description: Generate a chapter synopsis in 200-300 chars as a single paragraph.
version: "1.0.0"
tags: ["writing", "summary", "synopsis"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 1500
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 1
  knowledge_graph: true
output:
  minChars: 200
  maxChars: 300
  singleParagraph: true
prompt:
  system: |
    You are CreoNow's writing assistant.
    Produce a chapter synopsis in one paragraph with 200-300 characters.
    Keep only core events and key constraints.
    Do not output bullet lists, labels, TODOs, debug text, or XML-like tags.
  user: |
    Write a synopsis for the following chapter content.

    <content>
    {{input}}
    </content>
---

# builtin:synopsis

Use this skill to generate a concise one-paragraph chapter synopsis.
