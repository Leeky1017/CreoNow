# CN Backend Design — 索引

本目录是 CN 后端技术规范的模块化拆解（原单文件已拆解至此目录）。后端开发时按需查阅对应子文件。

---

## 子文件索引

| 文件 | 涵盖内容 | 查阅时机 |
| --- | --- | --- |
| [testing-strategy.md](testing-strategy.md) | 测试分层、测试原则、Skill 测试模板 | 写测试 / 新增 Skill 时 |
| [error-handling.md](error-handling.md) | API 错误分类、AbortController 层次、断路器、反防御型编程 | 错误处理 / Skill 中断恢复设计时 |
| [observability-and-security.md](observability-and-security.md) | 日志分层、性能 Profiling、埋点、安全实践 | 新增可观测性 / 安全相关代码时 |
| [kg-schema.md](kg-schema.md) | KG 核心数据模型、两层 Schema、别名、多值属性、SQLite 表、提取规则 | KG 数据层开发时 |
| [kg-interaction.md](kg-interaction.md) | 记忆边界、Dreaming 机制、Plan Mode、负面反馈学习、AI 提取 Prompt、多模型策略 | KG / 记忆 / AI 交互开发时 |
| [kg-infrastructure.md](kg-infrastructure.md) | FTS5 中文分词、用户体验原则 | 搜索 / FTS5 / KG UX 改动时 |
| [version-control.md](version-control.md) | 版本快照、分支写作、Fork 协作、数据模型 | 版本控制模块开发时 |
| [offline-and-export.md](offline-and-export.md) | 离线模式、导出格式、导入 | 离线 / 导出 / 导入功能开发时 |
| [multi-agent.md](multi-agent.md) | Writer / Reviewer / Judge 多 Agent 协作 | 多 Agent / 质量评判开发时 |

---

## 与代码的对应关系

| 子文件 | 主要对应代码路径 |
| --- | --- |
| testing-strategy | `apps/desktop/main/src/services/skills/__tests__/`、CI 配置 |
| error-handling | `services/ai/providerResolver.ts`、`services/skills/orchestrator.ts`、`services/ai/errorMapper.ts` |
| observability-and-security | `logging/logger.ts` |
| kg-schema | `services/kg/`（`kgCoreService.ts`、`kgWriteService.ts`、`types.ts`） |
| kg-interaction | `services/memory/`、`services/ai/runtimeConfig.ts`、`services/context/layerAssemblyService.ts` |
| kg-infrastructure | `services/search/ftsService.ts` |
| version-control | `services/version/linearSnapshotStore.ts` |
| offline-and-export | `services/export/exportService.ts`、`services/export/prosemirrorExporter.ts` |
| multi-agent | `services/judge/judgeService.ts`、`services/ai/judgeQualityService.ts` |
