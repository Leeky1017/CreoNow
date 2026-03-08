# A0-19 Export 纯文本诚实标注

- **GitHub Issue**: #998
- **所属任务簇**: P0-3（能力诚实分级与假功能处置）
- **涉及模块**: document-management
- **前端验收**: 需要

---

## Why：为什么必须做

### 1. 用户现象

用户在 ExportDialog 中看到 PDF 和 DOCX 导出选项，选项描述仅为"便携文档"和".docx"——没有任何暗示实际输出是纯文本。用户选择 PDF/DOCX 导出后，期望导出文件保留粗体、斜体、标题层级等格式，打开文件后才发现"一马平川"——所有格式信息静默丢失。期望与现实的落差，犹如"买椟还珠"的反面——用户以为买了珠，实际只得了朴素的白纸。

### 2. 根因

A0-04 已完成导出能力的诚实分级（spec 校准），确认了 v0.1 的 PDF/DOCX 导出仅支持纯文本。但 **ExportDialog 的 UI 层尚未同步标注**——格式选项的 description 仍沿用原文案，用户在选择时无法获知能力边界。

具体而言：
- A0-04 已将 `document-management/spec.md` 中的导出格式表更新为"能力级别"标注
- A0-04 已定义了 ExportDialog 中 PDF/DOCX 应显示 `t('export.format.pdfPlainTextHint')` / `t('export.format.docxPlainTextHint')` 的标注文案
- **但 A0-04 的 spec 变更尚未落地到代码**——本任务即为 A0-04 spec 的实施

### 3. v0.1 威胁

- **信任损耗**：导出是用户"交卷"的时刻——此处失信代价极高，一次受骗十次怀疑
- **竞品劣势**：主流创作工具（Scrivener、Typora）的 PDF/DOCX 导出至少保留基本格式，CreoNow 若不标注能力级别会被视为 bug 而非 feature gap
- **A0-04 闭环**：A0-04 已完成 spec 层面的分级，本任务负责 UI 层面的落地——两者共同构成导出能力诚实的完整闭环

### 4. 证据来源

| 文档 | 章节 | 内容 |
|------|------|------|
| `docs/audit/amp/01-master-roadmap.md` | §4.2 可信度必修项 | PDF/DOCX 导出能力与 spec 承诺不一致 |
| `openspec/changes/a0-04-export-honest-grading/` | Delta Spec | A0-04 已定义导出格式能力分级标注方案 |
| `docs/audit/amp/08-backend-module-health-audit.md` | §四 导出模块 | PDF: uses `contentText` only；DOCX: splits by line into Paragraph + TextRun |

---

## What：做什么

1. **修改 ExportDialog 格式选项 description**：PDF 选项 description 改为 `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"），DOCX 选项 description 改为 `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"）
2. **新增 i18n key**：`zh-CN.json` 和 `en.json` 同步新增 `export.format.pdfPlainTextHint`、`export.format.docxPlainTextHint`、`export.format.plainTextOnly`
3. **Markdown / TXT 选项不变**：保持现有 description，不做修改

---

## Scope

- **主规范**: `openspec/specs/document-management/spec.md`
- **涉及源码**:
  - `renderer/src/features/export/ExportDialog.tsx` — 修改 `getFormatOptions()` 中 PDF/DOCX 的 description
  - `renderer/src/i18n/locales/zh-CN.json` — 新增 i18n key
  - `renderer/src/i18n/locales/en.json` — 新增 i18n key
- **所属任务簇**: P0-3（能力诚实分级与假功能处置）
- **前置依赖**: **A0-04**（导出能力诚实分级）——A0-04 的 spec 变更是本任务的行为依据
- **下游影响**: 无——本任务是 A0-04 的最后实施步骤

---

## Non-Goals：不做什么

1. **不实现 PDF/DOCX 富文本导出**——v0.1 不投入 TipTap JSON → 富文本解析的工程量
2. **不修改导出后端逻辑**——`exportService` 的输出行为不变，本任务只改 UI 标注
3. **不新增导出格式（EPUB、HTML 等）**——格式扩展不在 v0.1 范围
4. **不修改 Markdown / TXT 导出行为**——这两个格式的行为和 description 保持不变
5. **不为 PDF/DOCX 添加 disabled 或移除入口**——用户仍可导出纯文本 PDF/DOCX，只需被诚实告知能力边界

---

## 依赖与影响

- **上游依赖**: A0-04（导出能力诚实分级）——A0-04 的 spec 修正和分级结论是本任务的前提
- **被依赖于**: 无
- **协调关系**: A0-06（发布事实表）——导出能力分级标注可纳入发布事实表
