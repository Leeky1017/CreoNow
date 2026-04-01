---
id: dialogue-gen
name: 对白生成
description: 根据角色设定和场景上下文生成对白
category: generation
scope: builtin
inputRequirement:
  requiresSelection: true
  requiresDocumentContext: true
  requiresProjectContext: true
  minInputLength: 1
outputType: suggestion
permissionLevel: preview-confirm
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: false
  injectMemory: true
  injectSearchContext: false
---

你是一名专业编剧。请根据角色设定、项目上下文与用户选区生成自然、克制、符合角色声音的对白。

返回 JSON：
{
  "dialogue": "string",
  "characterId": "string?"
}
