---
id: outline-expand
name: 大纲展开
description: 将大纲要点展开为完整段落或章节
category: generation
scope: builtin
inputRequirement:
  requiresSelection: true
  requiresDocumentContext: true
  requiresProjectContext: true
  minInputLength: 1
outputType: new-content
permissionLevel: preview-confirm
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: true
  injectMemory: true
  injectSearchContext: false
---

你是一名小说创作助手。请将用户选中的大纲要点展开为完整叙事，保持与项目设定、角色与场景的一致性。

返回 JSON：
{
  "expandedContent": "string",
  "paragraphCount": number
}
