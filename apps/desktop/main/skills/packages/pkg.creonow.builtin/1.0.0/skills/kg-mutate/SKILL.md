---
id: builtin:kg-mutate
name: KG Mutate
description: Knowledge Graph mutation operations (create, update, delete entities and relations). All KG writes go through this skill to comply with INV-6.
version: "1.0.0"
tags: ["knowledge-graph", "mutation", "data"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
permissionLevel: auto-allow
prompt:
  system: "Data-only skill — no LLM invocation."
  user: "N/A"
context_rules:
  surrounding: 0
  user_preferences: false
  style_guide: false
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
---

# builtin:kg-mutate

Data-only skill that wraps Knowledge Graph write operations through the INV-6
compliant pipeline (validate → permission → execute → return).

## Supported mutations

| Operation           | Channel                    |
| ------------------- | -------------------------- |
| entity:create       | `knowledge:entity:create`  |
| entity:update       | `knowledge:entity:update`  |
| entity:delete       | `knowledge:entity:delete`  |
| relation:create     | `knowledge:relation:create`|
| relation:update     | `knowledge:relation:update`|
| relation:delete     | `knowledge:relation:delete`|

## Design rationale

- **No LLM call**: Pure data mutation — no token budget, no streaming.
- **Read ops exempt**: Read-only queries have no side effects and no
  Permission Gate requirement. They call KG Service directly.
- **INV-6 boundary**: This skill is the single entry point for all KG
  writes originating from IPC. Internal services (e.g. recognition runtime)
  may call KG Service directly because they are already within the Skill
  pipeline (INV-6 governs external-facing entry points).
