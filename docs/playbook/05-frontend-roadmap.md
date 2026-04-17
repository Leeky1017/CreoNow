# 前端页面推进路线

> **黄金设计源**：`figma_design/前端完整参考/src/app/components/`
> **前端策略**：小修补，不大动。主 Workbench 已经成形；现在的问题主要是 **哪些页面已落地但文档没更新，哪些页面仍是半成品**。

## 页面清单与当前现状

| # | 页面 | 黄金源文件 | 当前主实现位置 | 当前状态 | 说明 |
|---|------|---------|-----------------|------|------|
| 1 | Layout | `layout.tsx` | `features/workbench/WorkbenchApp.tsx` | ✅ 主壳已落地 | 三栏、折叠、面板宽度、Zen、快捷键都已在 |
| 2 | Editor | `editor.tsx` | `features/editor/` + `features/workbench/` | 🟡 已落地主链 | ProseMirror bridge 已接入，但仍有体验细节可补 |
| 3 | AI Panel | `ai-panel.tsx` | `features/workbench/` | ✅ 可用 | 已有技能切换、生成态、preview/confirm |
| 4 | Characters | `characters.tsx` | 当前主流仍在 workbench 占位 | ⚠️ 未真正完成 | 文档不能再写“列表 CRUD 已成”，真实主界面还没完成角色面板 |
| 5 | Worldbuilding | `worldbuilding.tsx` | `features/workbench/components/WorldbuildingPanel.tsx` | 🟡 已实现大半 | 搜索 / tab / timeline 已在；新建入口仍偏绕 |
| 6 | Knowledge Graph | `knowledge-graph.tsx` | `features/workbench/components/KnowledgeGraphPanel.tsx` + `KnowledgeGraphCanvas.tsx` | ✅ 第一版已落地 | 图/摘要双视图、过滤、搜索、canvas 已在 |
| 7 | Memory Panel | `memory.tsx` | `features/workbench/components/MemoryPanel.tsx` | ✅ 已落地 | 列表 / 详情 / 搜索 / reload 都有 |
| 8 | Dashboard | `dashboard.tsx` | `RendererApp.tsx` + `features/dashboard/` | ✅ 入口页已落地 | 不应再写“部分实现” |
| 9 | Scenarios | `scenarios.tsx` | `features/workbench/components/ScenariosPanel.tsx` | 🟡 可用但数据偏本地 | UI 有了，真实数据接线仍可深化 |
| 10 | Calendar | `calendar.tsx` | `features/workbench/components/CalendarPanel.tsx` | 🟡 可用 | milestones / completion estimate 已接入，真日程系统仍未完成 |
| 11 | Command Palette | `command-palette.tsx` | `features/workbench/components/CommandPalette.tsx` | ✅ 已落地 | 快捷键与分组已可用 |
| 12 | Settings | `settings-modal.tsx` | `features/settings/SettingsPage.tsx` + `SettingsModal.tsx` | ✅ 已落地 | modal 与 page 两条入口都在 |
| 13 | Export / Publish | `export-publish-modal.tsx` | `features/workbench/components/ExportPublishModal.tsx` | 🟡 已落地大半 | 导出可用，publish/send 仍偏占位 |
| 14 | Welcome Screen | `welcome-screen.tsx` | `features/onboarding/WelcomeScreen.tsx` | ✅ 已落地 | 已进入入口流程 |
| 15 | Search Panel | （嵌入 layout） | `features/workbench/components/SearchPanel.tsx` | ✅ 已落地 | FTS / semantic / hybrid 已在 |

---

## 当前最值得做的前端收尾

### P1 / P3 收口
- FE-01：继续磨三栏壳与 Workbench 细节
- FE-02：继续磨 Editor 与 selection toolbar / preview 体验
- FE-03：AI Panel 细节补强
- FE-05：Characters 真正进入主流工作区
- FE-06：Worldbuilding 的 create / edit 流打通
- FE-08：Dashboard 继续接入 story status / world scale
- FE-09：Scenarios 从本地样例走向真实数据
- FE-10：Calendar 从“可见能力”走向“完整交互”
- FE-11：Search 结果表现继续打磨
- FE-12：Export / Publish 的 publish/send 真接线

### P4 / ENG 跟进
- 接 `#191` KG Canvas 性能与布局优化
- 接 `#195` KG 删除确认仪式到真实删除流
- 接 `#190` / memory follow-up 的 episodic / semantic 前台化
- 接 `#196` 等 ENG issues 的可见 UI

---

## 前端约束（保持不变）

1. 先读黄金源，再读现实现有组件，不得推翻重做。
2. 新组件必须优先接到现有 workbench，而不是另起一套平行 UI。
3. 颜色 / 阴影 / 字体继续走 token，禁止裸色值。
4. 新能力若没有进入主工作区，就不要在文档里写成“已完成页面”。
5. Storybook、截图、真实交互三者缺一不可。
