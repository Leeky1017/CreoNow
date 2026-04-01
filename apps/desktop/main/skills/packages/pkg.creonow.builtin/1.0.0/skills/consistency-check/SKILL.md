---
id: consistency-check
name: 一致性检查
description: 检查角色/地点设定与正文的一致性
version: "1.0.0"
tags: ["analysis", "consistency", "p3"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
inputType: document
outputType: annotation
permissionLevel: auto-allow
context_rules:
  surrounding: 0
  user_preferences: false
  style_guide: true
  characters: true
  outline: false
  recent_summary: 0
  knowledge_graph: true
prompt:
  system: |
    你是 CreoNow 的叙事一致性审阅器。请基于当前项目上下文，检查角色、地点与正文是否存在冲突。
    若没有明显冲突，也必须返回结构化 JSON。
  user: |
    请审阅以下正文，并输出 JSON：
    {
      "passed": boolean,
      "issues": [
        {
          "location": "string",
          "description": "string",
          "suggestion": "string",
          "severity": "error|warning|info",
          "relatedEntityId": "string?"
        }
      ]
    }

    <input>
    {{input}}
    </input>
---

# consistency-check

用于项目级一致性检查。运行时通过 Context Engine 注入知识图谱与创作约束；技能本身只负责返回结构化审阅结果。
