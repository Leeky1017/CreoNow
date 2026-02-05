# Design 04 — QA Gates（Storybook WSL-IP + 自动化门禁）

> Spec: `../spec.md#cnfa-req-012`

本规范的验收不是“编译通过”。必须同时满足：

1. 自动化测试（单测/组件测 + Playwright Electron E2E）
2. Storybook 视觉/交互验收（从 Windows 浏览器经 WSL IP 访问）

证据格式与“P0 → Tests/Stories”矩阵见：`design/08-test-and-qa-matrix.md`。

## 1) 为什么要求 WSL-IP Storybook

原因（面向非技术读者也可理解）：

- 代码通过≠界面可用；很多问题是“视觉与交互”问题（按钮点不到、焦点不对、弹窗无法关闭、hover/focus 错、滚动溢出等）。
- Storybook 是“把每个组件/页面单独拎出来验收”的工具，能比在 App 里更快定位 UI 问题。
- WSL-IP 从 Windows 浏览器访问，是为了确保在目标使用环境（Windows 侧）看到的效果一致。

## 2) Storybook 启动方式（WSL）

在 WSL（Linux）里运行：

```bash
pnpm -C apps/desktop storybook -- --host 0.0.0.0 -p 6006
```

获取 WSL IP（示例命令，任选其一）：

```bash
hostname -I
# 或：
ip addr | rg -n \"inet \" 
```

在 Windows 浏览器中访问：

- `http://<WSL_IP>:6006`

> 若你环境里 `http://localhost:6006` 也能访问，依然建议记录 WSL_IP 的访问证据，以满足本规范门禁口径。

## 3) 视觉/交互验收清单（必须）

### 3.1 全局检查（所有 stories 都适用）

- 打开 story 后，确认没有明显布局溢出（横向滚动条/遮挡/裁切）
- 鼠标 hover/active 样式正确
- 键盘 Tab 可聚焦到可交互元素（focus ring 正确、不会丢焦点）
- ESC 能正确关闭对话框/弹出层（如果存在）
- 错误态/禁用态文案清晰（不能“看起来能点”）

### 3.2 Layout 类（必须额外检查）

- `Layout/Resizer`：
  - 拖拽顺滑、hit area 正确、双击复位
- `Layout/AppShell` / `Layout/综合测试`：
  - Sidebar/RightPanel 折叠/展开无闪烁
  - 最小窗口尺寸下布局 clamp 正常

### 3.3 Dialog/Overlay 类（必须额外检查）

- `Features/SettingsDialog` / `Features/ExportDialog` / `Features/AiDialogs`：
  - 打开后焦点落点正确（首个可交互元素）
  - 关闭时焦点回到触发点
  - 长内容可滚动且不会溢出

### 3.4 Editor/AI 类（必须额外检查）

- 文本输入/选择不会触发错误的快捷键冲突
- Diff/Compare 视图可读，滚动与复制可用

## 4) 证据要求（RUN_LOG 必写）

每个 PR 必须在 `openspec/_ops/task_runs/ISSUE-<N>.md` 的 `Runs` 里追加：

- Storybook URL（必须是 Windows 浏览器访问的 WSL-IP 地址）
- 覆盖的 story 列表（至少列出本 PR 影响的 stories）
- 证据形式（二选一或都提供）：
  - 截图路径（存到 repo 外也可以，但必须能被 reviewer 获取）
  - 简短屏幕录制链接/路径

建议模板：

```md
### 2026-02-04 20:00 Storybook WSL-IP QA
- URL: http://<WSL_IP>:6006
- Checked stories:
  - Features/SettingsDialog
  - Layout/AppShell
- Evidence:
  - screenshots/<...>.png
```

## 5) 自动化门禁（最低要求）

每个任务卡会列出必须运行的测试，但最低门槛应包含：

- 相关 `vitest` 测试（针对改动目录）
- 相关 Playwright Electron E2E（至少覆盖新增入口与关键交互闭环）

> 禁止“未运行就宣称通过”。RUN_LOG 必须记录命令与关键输出。
