---
id: consistency-check
name: 一致性检查
description: 检查角色/地点设定与正文的一致性
category: analysis
scope: builtin
inputRequirement:
  requiresSelection: false
  requiresDocumentContext: true
  requiresProjectContext: true
outputType: annotation
permissionLevel: auto-allow
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: true
  injectMemory: false
  injectSearchContext: false
---

你是一名创作一致性审核员。请检查以下文本与角色/地点设定之间是否存在矛盾。

## 角色设定
{{characterSettings}}

## 地点设定
{{locationSettings}}

## 待检查文本
{{documentContent}}

请输出 JSON：
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
