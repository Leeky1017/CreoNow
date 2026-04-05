# P3 变更清单

> P3 阶段（项目制长篇创作）所有 Spec 变更的文件级索引、模块依赖关系和实现优先级排序。

---

## 1. 文件级变更列表

### 修改（Spec 文件新增 P3 Section）

| 文件 | 变更类型 | 新增 Section 数 | 描述 |
|------|---------|----------------|------|
| `openspec/specs/project-management/spec.md` | 修改 | 3 | ProjectConfig 扩展、多文档管理、项目切换扩展绑定 |
| `openspec/specs/knowledge-graph/spec.md` | 修改 | 4 | 角色列表 CRUD、地点列表 CRUD、AI 注入机制、降级策略 |
| `openspec/specs/memory-system/spec.md` | 修改 | 2 | Simple Memory（MemoryRecord key-value）、偏好面板 |
| `openspec/specs/skill-system/spec.md` | 修改 | 4 | SKILL.md 定义格式、一致性检查、对白生成、大纲展开 |
| `openspec/specs/search-and-retrieval/spec.md` | 修改 | 1 | 项目范围全文搜索（FTS5 + ProseMirror 文本提取） |
| `openspec/specs/document-management/spec.md` | 修改 | 1 | ProseMirror 导出适配（Markdown / DOCX / PDF） |

### 新建（参考文档）

| 文件 | 描述 |
|------|------|
| `docs/references/cc-analysis/P3-ARCHITECTURE-DISTILL.md` | CC 源码模式 → CN P3 适配方案对照表 |
| `docs/references/cc-analysis/P3-CHANGES.md` | 本文档 |

### 未修改（P3 可直接使用）

| 文件 | 说明 |
|------|------|
| `openspec/specs/editor/spec.md` | 编辑器 ProseMirror 基础已在 P1 完成 |
| `openspec/specs/ai-service/spec.md` | AI 服务基础已在 P1/P2 完成 |
| `openspec/specs/version-control/spec.md` | 版本控制基础已有 |
| `openspec/specs/context-engine/spec.md` | Context Engine 层级组装已有，P3 注入不改变架构 |
| `openspec/specs/ipc/spec.md` | IPC 契约系统已就绪 |
| `openspec/specs/workbench/spec.md` | Workbench 基础已有 |

---

## 2. 模块依赖关系

```
                    ┌─────────────────────────────┐
                    │  3A project-management       │
                    │  ProjectConfig + multi-doc   │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  3B knowledge-graph          │
                    │  Character/Location CRUD     │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  3C memory-system            │
                    │  Simple Memory + auto-inject │
                    └─────────────────────────────┘

┌──────────────┐    ┌─────────────────────────────┐
│  3D skill-   │    │  3E search-and-retrieval     │
│  system      │    │  FTS5 project-scoped         │
│  (独立)      │    │  (独立)                      │
└──────────────┘    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │  3F document-management      │
                    │  ProseMirror export          │
                    │  (依赖 3A + stable doc fmt)  │
                    └─────────────────────────────┘
```

### 依赖矩阵

| 模块 | 依赖 | 被依赖 |
|------|------|--------|
| 3A Project Management | P2 outputs | 3B, 3C, 3F |
| 3B Settings (KG) | 3A | 3C |
| 3C Simple Memory | 3A, 3B | — |
| 3D Skill Extension | P1/P2 skill-system | — |
| 3E Full-text Search | P1 editor (ProseMirror) | — |
| 3F Export | 3A, P1 editor | — |

---

## 3. 实现优先级排序

### Wave 1（基础层，无外部依赖）

| 优先级 | 模块 | 工作量估算 | 理由 |
|--------|------|-----------|------|
| 1 | 3A Project Management | 中 | 所有其他模块的 projectId scope 依赖此 |
| 2 | 3E Full-text Search | 小 | 独立模块，FTS5 基础已有 |
| 3 | 3D Skill Extension — SKILL.md 格式 | 小 | 技能注册基础设施 |

### Wave 2（依赖 Wave 1）

| 优先级 | 模块 | 工作量估算 | 理由 |
|--------|------|-----------|------|
| 4 | 3B Settings Management (Character/Location CRUD) | 中 | 依赖 3A 的 projectId |
| 5 | 3D Skill Extension — 三个新技能 | 中 | 需要 3B 的角色/地点数据 |

### Wave 3（依赖 Wave 2）

| 优先级 | 模块 | 工作量估算 | 理由 |
|--------|------|-----------|------|
| 6 | 3C Simple Memory | 中 | 需要 3B 的角色/地点设定同步 |
| 7 | 3F Export | 中 | 需要稳定的 ProseMirror 文档格式 |

---

## 4. 新文件清单

### 后端服务（`main/src/services/`）

| 文件路径 | 模块 | 描述 |
|---------|------|------|
| `main/src/services/settings/characterService.ts` | 3B | 角色 CRUD 服务 |
| `main/src/services/settings/locationService.ts` | 3B | 地点 CRUD 服务 |
| `main/src/services/settings/settingsTypes.ts` | 3B | CharacterEntry / LocationEntry 类型 |
| `main/src/services/memory/simpleMemoryService.ts` | 3C | 简单记忆 key-value 服务 |
| `main/src/services/memory/memoryInjector.ts` | 3C | 记忆注入器（precision > recall） |
| `main/src/services/memory/simpleMemoryTypes.ts` | 3C | MemoryRecord / MemoryInjection 类型 |
| `main/src/services/search/projectSearchService.ts` | 3E | 项目范围 FTS5 搜索服务 |
| `main/src/services/search/textExtractor.ts` | 3E | ProseMirror JSON → 纯文本 |
| `main/src/services/export/proseMirrorExporter.ts` | 3F | ProseMirror → MD/DOCX/PDF 转换 |
| `main/src/services/export/exportTypes.ts` | 3F | ExportOptions / ExportResult 类型 |

### IPC 层（`main/src/ipc/`）

| 文件路径 | 模块 | 描述 |
|---------|------|------|
| `main/src/ipc/settings.ts` | 3B | settings:character:* / settings:location:* |
| `main/src/ipc/simpleMemory.ts` | 3C | memory:simple:* |
| `main/src/ipc/search.ts` | 3E | search:fts:* |
| `main/src/ipc/export.ts` | 3F | export:document:write / export:project:write / export:progress |

### 技能定义（`main/skills/packages/`）

| 文件路径 | 模块 | 描述 |
|---------|------|------|
| `main/skills/packages/consistency-check.skill.md` | 3D | 一致性检查技能定义 |
| `main/skills/packages/dialogue-gen.skill.md` | 3D | 对白生成技能定义 |
| `main/skills/packages/outline-expand.skill.md` | 3D | 大纲展开技能定义 |

### 前端（`renderer/src/`）

| 文件路径 | 模块 | 描述 |
|---------|------|------|
| `renderer/src/features/settings/CharacterList.tsx` | 3B | 角色列表组件 |
| `renderer/src/features/settings/CharacterDetail.tsx` | 3B | 角色详情编辑组件 |
| `renderer/src/features/settings/LocationList.tsx` | 3B | 地点列表组件 |
| `renderer/src/features/settings/LocationDetail.tsx` | 3B | 地点详情编辑组件 |
| `renderer/src/features/memory/PreferencePanel.tsx` | 3C | 偏好面板组件 |
| `renderer/src/features/search/ProjectSearchPanel.tsx` | 3E | 项目搜索面板组件 |
| `renderer/src/features/export/ExportDialog.tsx` | 3F | 导出对话框组件 |
| `renderer/src/features/export/ExportProgress.tsx` | 3F | 导出进度组件 |
| `renderer/src/stores/settingsStore.ts` | 3B | 角色/地点 Store |
| `renderer/src/stores/simpleMemoryStore.ts` | 3C | 简单记忆 Store |

### 测试文件

| 文件路径 | 模块 | 描述 |
|---------|------|------|
| `main/src/services/settings/__tests__/characterService.test.ts` | 3B | 角色 CRUD 单元测试 |
| `main/src/services/settings/__tests__/locationService.test.ts` | 3B | 地点 CRUD 单元测试 |
| `main/src/services/memory/__tests__/simpleMemoryService.test.ts` | 3C | 简单记忆服务单元测试 |
| `main/src/services/memory/__tests__/memoryInjector.test.ts` | 3C | 记忆注入器单元测试（precision > recall 验证） |
| `main/src/services/search/__tests__/projectSearchService.test.ts` | 3E | 项目搜索服务单元测试 |
| `main/src/services/search/__tests__/textExtractor.test.ts` | 3E | 文本提取器单元测试 |
| `main/src/services/export/__tests__/proseMirrorExporter.test.ts` | 3F | ProseMirror 导出器单元测试 |
| `main/skills/__tests__/skillDefinitionParser.test.ts` | 3D | SKILL.md 解析器单元测试 |
| `renderer/src/features/settings/__tests__/CharacterList.test.tsx` | 3B | 角色列表组件测试 |
| `renderer/src/features/memory/__tests__/PreferencePanel.test.tsx` | 3C | 偏好面板组件测试 |

---

## 5. 现有文件修改清单

| 文件路径 | 模块 | 修改内容 |
|---------|------|---------|
| `packages/shared/types/ipc-generated.ts` | 全局 | 新增 P3 IPC 通道和错误码 |
| `packages/shared/types/orchestrator.ts` | 3D | 新增 P3 WritingEvent 变体 |
| `main/src/services/skills/writingOrchestrator.ts` | 3D | 支持 SKILL.md 解析和新技能注册 |
| `main/src/services/skills/skillRegistry.ts` | 3D | SKILL.md 扫描和注册 |
| `renderer/src/features/ai/SkillPanel.tsx` | 3D | 新增三个技能的 UI 入口 |
| `main/src/services/projects/projectLifecycle.ts` | 3A | 扩展 unbind/bind 范围覆盖 Settings/Memory/Search |
| `main/src/services/projects/projectService.ts` | 3A | ProjectConfig 扩展字段 |
| `renderer/src/stores/projectStore.tsx` | 3A | 扩展 ProjectConfig 状态管理 |

---

## 6. P3 新增 IPC 通道汇总

| 通道 | 模块 | 通信模式 |
|------|------|---------|
| `project:config:get` | 3A | Request-Response |
| `project:config:update` | 3A | Request-Response |
| `project:style:get` | 3A | Request-Response |
| `project:documents:list` | 3A | Request-Response |
| `project:overview:get` | 3A | Request-Response |
| `settings:character:create` | 3B | Request-Response |
| `settings:character:read` | 3B | Request-Response |
| `settings:character:update` | 3B | Request-Response |
| `settings:character:delete` | 3B | Request-Response |
| `settings:character:list` | 3B | Request-Response |
| `settings:location:create` | 3B | Request-Response |
| `settings:location:read` | 3B | Request-Response |
| `settings:location:update` | 3B | Request-Response |
| `settings:location:delete` | 3B | Request-Response |
| `settings:location:list` | 3B | Request-Response |
| `memory:simple:write` | 3C | Request-Response |
| `memory:simple:read` | 3C | Request-Response |
| `memory:simple:delete` | 3C | Request-Response |
| `memory:simple:list` | 3C | Request-Response |
| `memory:simple:inject` | 3C | Request-Response |
| `memory:simple:clearproject` | 3C | Request-Response |
| `search:fts:query` | 3E | Request-Response |
| `search:fts:reindex` | 3E | Request-Response |
| `export:document:write` | 3F | Request-Response |
| `export:project:write` | 3F | Request-Response |
| `export:progress` | 3F | Push Notification |

---

## 7. P3 新增错误码汇总

| 错误码 | 模块 | 描述 |
|--------|------|------|
| `PROJECT_NOT_FOUND` | 3A | 项目不存在 |
| `PROJECT_CONFIG_INVALID` | 3A | 配置校验失败 |
| `PROJECT_GENRE_REQUIRED` | 3A | P3 体裁必填 |
| `CHARACTER_NAME_REQUIRED` | 3B | 角色名称为空 |
| `CHARACTER_NAME_DUPLICATE` | 3B | 同项目内角色重名 |
| `CHARACTER_NOT_FOUND` | 3B | 角色不存在 |
| `CHARACTER_ATTR_KEY_TOO_LONG` | 3B | 属性键超长 |
| `CHARACTER_ATTR_LIMIT_EXCEEDED` | 3B | 单角色属性数超限 |
| `CHARACTER_CAPACITY_EXCEEDED` | 3B | 角色数量超限 |
| `LOCATION_NAME_REQUIRED` | 3B | 地点名称为空 |
| `LOCATION_NAME_DUPLICATE` | 3B | 同项目内地点重名 |
| `LOCATION_NOT_FOUND` | 3B | 地点不存在 |
| `LOCATION_ATTR_KEY_TOO_LONG` | 3B | 地点属性键超长 |
| `LOCATION_ATTR_LIMIT_EXCEEDED` | 3B | 单地点属性数超限 |
| `LOCATION_CAPACITY_EXCEEDED` | 3B | 地点数量超限 |
| `MEMORY_KEY_REQUIRED` | 3C | 记忆 key 为空 |
| `MEMORY_KEY_TOO_LONG` | 3C | 记忆 key 超长 |
| `MEMORY_VALUE_TOO_LONG` | 3C | 记忆 value 超长 |
| `MEMORY_NOT_FOUND` | 3C | 记忆不存在 |
| `MEMORY_SERVICE_UNAVAILABLE` | 3C | 记忆服务不可用 |
| `MEMORY_CAPACITY_EXCEEDED` | 3C | 记忆条目超限 |
| `SEARCH_QUERY_EMPTY` | 3E | 搜索词为空 |
| `SEARCH_QUERY_TOO_LONG` | 3E | 搜索词超长 |
| `SEARCH_INDEX_NOT_FOUND` | 3E | FTS 索引不存在 |
| `SEARCH_INDEX_CORRUPTED` | 3E | FTS 索引损坏 |
| `SEARCH_PROJECT_NOT_FOUND` | 3E | 搜索项目不存在 |
| `SEARCH_TIMEOUT` | 3E | 搜索超时 |
| `EXPORT_FORMAT_UNSUPPORTED` | 3F | 导出格式不支持 |
| `EXPORT_WRITE_ERROR` | 3F | 导出写入失败 |
| `EXPORT_EMPTY_DOCUMENT` | 3F | 导出空文档 |
| `EXPORT_UNSUPPORTED_NODE` | 3F | 不支持的 ProseMirror 节点 |
| `EXPORT_SIZE_EXCEEDED` | 3F | 导出体积超限 |
| `EXPORT_INTERRUPTED` | 3F | 导出中断 |
| `SKILL_PARSE_FAILED` | 3D | SKILL.md 解析失败 |

---

## 8. P3 新增 WritingEvent 变体汇总

```typescript
// 3A Project Management
| { type: 'project-config-updated'; timestamp: number; projectId: string; changedFields: string[] }

// 3B Settings (Character/Location)
| { type: 'character-updated'; timestamp: number; projectId: string; characterId: string; action: 'created' | 'updated' | 'deleted' }
| { type: 'location-created'; timestamp: number; projectId: string; locationId: string }
| { type: 'location-updated'; timestamp: number; projectId: string; locationId: string }
| { type: 'location-deleted'; timestamp: number; projectId: string; locationId: string }

// 3C Simple Memory
| { type: 'memory-injected'; timestamp: number; projectId: string; recordCount: number; tokenCount: number; degraded: boolean }
| { type: 'memory-updated'; timestamp: number; projectId: string | null; key: string; action: 'written' | 'deleted' | 'cleared' }

// 3E Search
| { type: 'search-index-updated'; timestamp: number; projectId: string; documentId: string; action: 'indexed' | 'removed' | 'rebuilt' }

// 3D Skill — 一致性检查
| { type: 'consistency-check-completed'; timestamp: number; projectId: string; passed: boolean; issueCount: number }

// 3F Export
| { type: 'export-completed'; timestamp: number; projectId: string; format: ExportFormat; documentCount: number; success: boolean }
```
