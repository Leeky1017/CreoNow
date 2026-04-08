> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 六、离线模式与导出导入

CN 是本地桌面应用。断网时用户必须能继续写作，数据完全属于用户。

---

## 6.1 离线模式（设计目标，尚未实现专门的离线检测/恢复流程）

```
用户断网
  -> 写作正常（纯本地编辑器）
  -> KG 查询正常（SQLite 本地）
  -> FTS5 搜索正常（SQLite 本地）
  -> 版本快照正常（SQLite 本地）
  -> AI 功能不可用 -> 友好提示"当前离线，AI 功能暂停"
  -> 系统记录"待提取队列"

用户恢复网络
  -> 系统每 20 分钟检测网络状态（计划实现）
  -> 检测到联网 -> 检查 API 可用性
    -> 可用 -> 自动运行待提取队列（后台异步）
    -> 不可用 -> 提醒用户"API 余额不足"
```

核心原则：能本地正常的一定要保证正常。只有 AI 生成和 KG 提取需要网络。

## 6.2 导出

当前已实现的导出格式：Markdown / Word（docx） / PDF / TXT（由 `prosemirrorExporter.ts` 提供）。

> **已实现位置**：`apps/desktop/main/src/services/export/exportService.ts`（导出编排）、`services/export/prosemirrorExporter.ts`（ProseMirror → 多格式转换）、`services/export/exportRichText.ts`（富文本导出）。测试见 `services/export/__tests__/`（含 Markdown / PDF / TXT-DOCX / 进度生命周期 / 流式导出等测试）。

- 计划新增：ePub 格式导出（尚未实现）
- 可选导出 KG：用户勾选"同时导出 KG 数据"时，导出 JSON 格式（计划实现）
- 分支导出：可以选择导出哪条分支（计划实现；当前导出 IPC 无分支参数）
- 数据完全属于用户，当前已支持文档内容的完整导出（Markdown/Word/PDF/TXT）；KG 和分支维度的完整导出为计划实现

## 6.3 导入（计划实现）

以下功能尚未实现，当前代码中无 import IPC handler 或 import service：

- 支持导入纯文本（Markdown / Word / TXT）-> AI 自动跑一遍 KG 提取
- 支持导入 CN 格式的 KG JSON -> 还原完整项目
