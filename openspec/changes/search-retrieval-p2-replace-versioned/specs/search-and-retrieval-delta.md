# Search & Retrieval Specification Delta

## Change: search-retrieval-p2-replace-versioned

### Requirement: 搜索替换 [MODIFIED]

SR-3 固化可回滚替换链路，确保大范围替换前后均可追溯。

替换入口与参数：

- 搜索替换面板（`Cmd/Ctrl+H`）。
- 作用范围：`currentDocument` / `wholeProject`。
- 开关：`regex`、`caseSensitive`、`wholeWord`。

IPC 契约：

| IPC 通道                 | 请求 Schema（Zod）            | 响应 Schema（Zod）             | 说明           |
| ------------------------ | ----------------------------- | ------------------------------ | -------------- |
| `search:replace:preview` | `SearchReplacePreviewRequest` | `SearchReplacePreviewResponse` | 预览受影响范围 |
| `search:replace:execute` | `SearchReplaceExecuteRequest` | `SearchReplaceExecuteResponse` | 执行替换       |

`search:replace:preview` 最小响应字段：

- `affectedDocuments`
- `totalMatches`
- `items[]`（`documentId`, `title`, `matchCount`, `sample`）
- `warnings[]`

`search:replace:execute` 最小响应字段：

- `replacedCount`
- `affectedDocumentCount`
- `snapshotIds[]`
- `skipped[]`

全项目替换确认与快照策略：

1. 用户必须先执行 `search:replace:preview`。
2. UI 展示受影响文档数与匹配总数。
3. 用户确认后才能调用 `search:replace:execute`。
4. `wholeProject` 执行前，系统必须为每个受影响文档调用 `version:snapshot:create`，`reason="pre-search-replace"`。
5. 任一文档快照失败则该文档替换跳过并记录 `skipped[]`，整体返回可判定结果。

#### Scenario: SR3-R1-S1 当前文档替换 [MODIFIED]

- **假设** 用户在当前文档打开替换面板
- **当** 输入搜索词、替换词并执行「全部替换」
- **则** 当前文档内匹配项被统一替换
- **并且** 高亮范围同步更新

#### Scenario: SR3-R1-S2 全项目替换先预览后确认 [MODIFIED]

- **假设** 用户切换替换范围为全项目
- **当** 执行 `search:replace:preview`
- **则** 返回受影响文档数与匹配总数
- **当** 用户确认后执行 `search:replace:execute`
- **则** 系统完成替换并返回替换回执

#### Scenario: SR3-R1-S3 全项目替换前创建版本快照 [MODIFIED]

- **假设** 预览显示多个文档将被替换
- **当** 用户确认执行
- **则** 系统先为每个受影响文档创建版本快照
- **并且** 快照完成后才执行文本替换
- **并且** 用户可通过 Version Control 对任一文档回滚

## Out of Scope

- 回滚面板交互扩展与批量撤销 UX 优化。
- 混合检索重排与 explain。
- 新增检索算法。
