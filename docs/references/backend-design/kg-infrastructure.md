> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 四、智能系统设计 — 基础设施（FTS5 分词 · 用户体验原则）

本文件涵盖 KG 基础设施层（§4.16–4.17）。数据层见 [kg-schema.md](kg-schema.md)，交互层见 [kg-interaction.md](kg-interaction.md)。

---

## 4.16 FTS5 中文分词方案

**当前实现**：`services/search/ftsService.ts` 使用 FTS5 `unicode61` tokenizer + CJK 查询扩展，无需额外分词依赖。

> **已实现位置**：`apps/desktop/main/src/services/search/ftsService.ts`（FTS5 全文搜索服务）。混合排序见 `services/search/hybridRankingService.ts`；项目级搜索见 `services/search/projectSearch.ts`；搜索替换见 `services/search/searchReplaceService.ts`。

**目标方案**（计划引入，当前未安装）：jieba 预处理 + FTS5 simple tokenizer，提升中文分词精度：

- 依赖：`nodejieba`（C++ 原生 Node.js binding）
- 写入流程：文本 -> nodejieba 分词 -> 空格分隔的词语 -> 写入 FTS5
- 查询流程：搜索词 -> nodejieba 分词 -> FTS5 MATCH 查询

```ts
import { cut } from 'nodejieba'

const text = '张三走进了柏林的安全屋'
const segmented = cut(text).join(' ')  // "张三 走进 了 柏林 的 安全屋"
```

## 4.17 用户体验原则

- KG 对用户透明：用户看到的是"角色卡片""关系网络""时间线"，不是"知识图谱"
- 自定义必须简单：加一个"修炼境界"属性应该跟在 Notion 加一列一样简单
- AI 提取不能烦人：先加，错了再改，不弹窗确认
- Schema 演进而非设计：不需要写作前设计好 Schema
