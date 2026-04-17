---
id: extract-session-events
name: 会话事件提取
description: 从当前写作内容提取可落库的 episodic 事件
version: "1.0.0"
tags: ["analysis", "memory", "episodic", "p4"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
inputType: document
outputType: annotation
permissionLevel: auto-allow
context_rules:
  surrounding: 0
  user_preferences: false
  style_guide: false
  characters: true
  outline: true
  recent_summary: 0
  knowledge_graph: true
prompt:
  system: |
    你是 CreoNow 的 episodic memory 提取器。
    任务：从输入正文中提取“本次写作值得记住的事件”，用于后续记忆蒸馏。
    只输出 JSON，不要输出解释。
  user: |
    请提取 0~3 条关键事件，并严格按以下 JSON 返回：
    {
      "events": [
        {
          "sceneType": "dialogue|action|description|turning_point|general",
          "summary": "string",
          "inputContext": "string",
          "finalText": "string",
          "importance": 0.0,
          "editDistance": 0.0
        }
      ]
    }

    规则：
    - 没有明显事件时返回 {"events":[]}
    - importance 取值范围 0~1
    - editDistance 若未知填 0
    - finalText 使用可直接存档的短句（<=200 字）

    <input>
    {{input}}
    </input>
---

# extract-session-events

用于 INV-8 post-writing hook 的会话事件提取入口。输出供 `episodicMemoryService.recordEpisode` 落库。
