# Design 08 — Test & QA Matrix（自动化 + Storybook 手工 + 证据格式）

> Spec: `../spec.md#cnfa-req-012`

本文件解决审计指出的风险：验收门禁若不“格式化/可复用”，容易退化为“看一眼就过”。

本文件提供三件事：

1. **证据格式标准**（RUN_LOG 必写什么）
2. **自动化测试矩阵**（每个 P0 任务需要哪些 tests）
3. **Storybook WSL-IP 检查清单**（按任务/故事分类）

---

## 1) Evidence 标准（RUN_LOG 模板）

### 1.1 快速启动（两条命令）

```bash
# 1) 启动 Storybook（绑定 0.0.0.0）
pnpm -C apps/desktop storybook:wsl

# 2) 获取 Windows 浏览器访问 URL
./scripts/wsl_storybook_url.sh
```

### 1.2 每个 PR 必须包含的证据块（MUST）

在 `openspec/_ops/task_runs/ISSUE-<N>.md` 的 `Runs` 里追加一个小节（只追加不回写）：

```md
### <YYYY-MM-DD HH:MM> <short label>
- Command: `<command>`
- Key output: `<key lines>`
- Evidence:
  - Storybook WSL-IP URL: `http://<WSL_IP>:6006`
  - Checked stories: <titles...>
  - Screenshots/recordings: <paths or links>
  - Notes: <what you verified + edge cases>
```

### 1.3 Storybook 证据最小要求（MUST）

- 必须包含：WSL-IP URL（Windows 浏览器访问的地址）
- 必须列出：本 PR 影响的 stories（至少 2 个）
- 必须提供：截图或短录屏路径（可 repo 外，但 reviewer 必须可拿到）

### 1.4 可复制粘贴的证据模板

```md
### YYYY-MM-DD HH:MM Storybook WSL-IP QA
- Command: `pnpm -C apps/desktop storybook:wsl`
- Key output: Storybook 9.0.3 for react-vite started (localhost:6006)
- Evidence:
  - Storybook WSL-IP URL: `http://<WSL_IP>:6006`
  - Checked stories:
    - Features/XXX（检查点：...）
    - Layout/YYY（检查点：...）
  - Screenshots/recordings: N/A（文本证据描述）
  - Notes: hover/focus 正常、ESC 关闭正常、无布局溢出
```

---

## 2) 自动化测试矩阵（P0 → Tests）

> 规则：影响用户关键路径的 P0 必须有 E2E gate；纯映射/纯函数可用 unit gate。

| P0 任务 | 必须新增/更新的测试 | 说明 |
| --- | --- | --- |
| P0-001 Surface registry | `apps/desktop/tests/unit/storybook-inventory.spec.ts` | Inventory parity gate（以 stories 提取为准；截至 2026-02-05 为 56/56） |
| P0-002 Command palette | `apps/desktop/tests/e2e/command-palette.spec.ts` | 快捷键/命令可达；禁止 Cmd/Ctrl+B 冲突 |
| P0-003 SettingsDialog | `apps/desktop/tests/e2e/settings-dialog.spec.ts`（新增） + 更新 `theme.spec.ts`（如需） | 打开/修改/重启仍生效；Proxy/Judge 错误可见 |
| P0-004 ExportDialog | 新增 `export-dialog.spec.ts` + 更新 `export-markdown.spec.ts` | 从直出改为对话框；UNSUPPORTED 禁用态 |
| P0-005 Dashboard actions | 新增 `dashboard-project-actions.spec.ts` | rename/duplicate/archive/delete 全覆盖（含确认与重启） |
| P0-006 Outline | 新增 unit `deriveOutline.test.ts` + E2E `outline-panel.spec.ts` | 派生 + 导航 + 边界 heading |
| P0-007 Version history | 新增 `version-history.spec.ts` | list/compare/restore 全闭环 |
| P0-008 Characters via KG | 新增 unit `characterFromKg.test.ts` + E2E `characters.spec.ts` | metadataJson 解析/降级 + CRUD/relations |
| P0-009 KG visualization | 新增 unit `kgToGraph.test.ts` + E2E `knowledge-graph-visualization.spec.ts` | 映射稳定 + node 位置持久化 |
| P0-010 RightPanel info/quality | 新增 `rightpanel-info-quality.spec.ts` | stats/judge/constraints 真接电；错误态可见 |
| P0-011 Zen mode | 新增 `zen-mode.spec.ts` | F11/ESC 进入退出；overlay 可见 |
| P0-012 SystemDialog unify | 新增 `system-dialog.spec.ts`（或扩展 filetree/kg E2E） | Cancel/Confirm 两条路径；无 `window.confirm` |
| P0-013 AI surface | 更新 `ai-runtime.spec.ts` / `skills.spec.ts` +（如引入 history/new chat）新增 `ai-history.spec.ts` | 禁止 `console.log` 占位；History/New Chat 行为可判定；Skill settings 入口对齐 SettingsDialog |
| P0-014 Storybook gate | （可选）脚本输出测试 | 主要是流程固化与证据格式，不强制 E2E |

---

## 3) Storybook WSL-IP 检查清单（按任务）

> 规则：每个 PR 至少检查“本 PR 直接改动的 stories”。不要只检查一个 story。

### P0-002（CommandPalette）

- `Features/CommandPalette`
- 重点：键盘上下/Enter/ESC、搜索过滤、错误提示区域

### P0-003（SettingsDialog）

- `Features/SettingsDialog`
- 重点：tab 切换、滚动、焦点/关闭、禁用态、保存/取消

### P0-004（ExportDialog）

- `Features/ExportDialog`
- 重点：格式切换、UNSUPPORTED 禁用、progress/success 视觉

### P0-005（Dashboard/CreateProjectDialog）

- `Features/Dashboard/DashboardPage`
- `Features/CreateProjectDialog`
- `Features/CreateTemplateDialog`
- 重点：卡片菜单操作、对话框错误态、ImageUpload 边界（大小/格式）

### P0-006（Outline）

- `Features/OutlinePanel`
- 重点：层级缩进、hover/focus、点击反馈

### P0-007（Version/Diff）

- `Features/VersionHistoryPanel`
- `Features/DiffView`
- 重点：按钮禁用态、diff 可读性、长 diff 滚动

### P0-008（Characters）

- `Features/CharacterPanel`
- 重点：分组/详情弹窗、删除按钮 hover/确认

### P0-009（KnowledgeGraph）

- `Features/KnowledgeGraph`
- 重点：拖拽/缩放/选择节点、编辑对话框

### P0-010（RightPanel/Quality）

- `Layout/RightPanel`
- `Features/QualityGatesPanel`
- 重点：tab 切换、running/error 状态视觉、布局溢出

### P0-011（ZenMode）

- `Features/ZenMode`
- 重点：hover 出现退出按钮、底部状态栏、ESC 退出

### P0-012（AiDialogs）

- `Features/AiDialogs`
- 重点：SystemDialog 各类型、AiErrorCard 文案与视觉

### P0-013（AI Surface）

- `Features/AiPanel`
- `Features/SkillPicker`
- 重点：History/New Chat 行为（或禁用态）可判定；Skill settings 入口不再 console.log；错误态可读

### P0-014（Layout 综合回归）

- `Layout/综合测试`
- `Layout/AppShell`
- `Layout/Sidebar`
- `Layout/Resizer`
- 重点：拖拽/折叠/最小尺寸 clamp/溢出
