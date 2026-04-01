---
id: dialogue-gen
name: 对白生成
description: 根据角色设定和场景上下文生成对白
version: "1.0.0"
tags: ["generation", "dialogue", "p3"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
inputType: selection
outputType: suggestion
permissionLevel: preview-confirm
context_rules:
  surrounding: 800
  user_preferences: true
  style_guide: true
  characters: true
  outline: false
  recent_summary: 1
  knowledge_graph: true
prompt:
  system: |
    你是 CreoNow 的对白生成助手。请生成自然、克制、符合角色声音的中文对白，并保持与上下文一致。
    只返回 JSON，不要附加解释。
  user: |
    请基于以下输入生成对白，返回 JSON：
    {
      "dialogue": "string",
      "characterId": "string?"
    }

    <input>
    {{input}}
    </input>
---

# dialogue-gen

用于基于当前选区生成对白建议。运行时依赖标准 loader / validator / executor 链路。
