---
id: update-writing-profile
name: 写作画像更新
description: 基于累计情景事件提炼持久写作偏好
version: "1.0.0"
tags: ["analysis", "memory", "semantic", "p4"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
inputType: document
outputType: annotation
permissionLevel: auto-allow
context_rules:
  surrounding: 0
  user_preferences: true
  style_guide: true
  characters: true
  outline: true
  recent_summary: 5
  knowledge_graph: true
prompt:
  system: |
    你是 CreoNow 的语义记忆蒸馏助手。
    从输入的 episodic 线索中提炼稳定写作偏好，输出结构化 JSON。
  user: |
    请输出 JSON：
    {
      "rules": [
        {
          "rule": "string",
          "category": "style|structure|character|pacing|vocabulary",
          "confidence": 0.0
        }
      ]
    }

    规则：
    - 只保留长期有效偏好，不要记录一次性剧情细节
    - confidence 在 0~1
    - 没有可靠结论时返回 {"rules":[]}

    <input>
    {{input}}
    </input>
---

# update-writing-profile

用于 P4+ 的语义记忆更新入口。当前主要用于注册能力与后续 hook/定时蒸馏对接。
