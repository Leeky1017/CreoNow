# P0-014: Storybook WSL-IP QA Gate（流程固化 + 证据格式）

Status: todo

## Goal

把“Storybook 必须经 WSL-IP 在 Windows 浏览器验收”的要求固化为团队可执行的门禁流程，避免口口相传/执行走样：

- 一条命令启动 Storybook（绑定 0.0.0.0）
- 一条命令打印 WSL IP 与访问 URL
- RUN_LOG 证据格式固定（reviewer 一眼能看懂）

## Dependencies

- Spec: `../spec.md#cnfa-req-012`
- Design: `../design/04-qa-gates-storybook-wsl.md`
- Design: `../design/08-test-and-qa-matrix.md`（证据格式与检查清单 SSOT）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/package.json`（新增 `storybook:wsl` script：`storybook dev --host 0.0.0.0 -p 6006`） |
| Add | `scripts/wsl_storybook_url.sh`（输出 `http://<WSL_IP>:6006`；仅打印，不写文件） |
| Update | `openspec/specs/creonow-frontend-full-assembly/design/04-qa-gates-storybook-wsl.md`（把真实脚本与命令回填） |
| Add (optional) | `openspec/_ops/task_runs/RUN_LOG_TEMPLATE.md`（若需要：提供统一模板；否则以 Design 08 为准） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：Storybook WSL 可达
   - 增加 `storybook:wsl` script（host=0.0.0.0）
   - 增加 URL 打印脚本（动态读取 WSL IP）
2. PR-B：证据格式固化
   - Design 04/08 的模板对齐到“可复制粘贴”的最终形态
   - RUN_LOG 示例条目可直接复用

## Acceptance Criteria

- [ ] `pnpm -C apps/desktop storybook:wsl` 可启动 storybook 并从 Windows 浏览器用 `http://<WSL_IP>:6006` 打开
- [ ] `scripts/wsl_storybook_url.sh` 输出格式固定：
  - [ ] 打印 WSL_IP
  - [ ] 打印完整 URL
- [ ] RUN_LOG 证据格式固定且可复制粘贴（见 `design/08-test-and-qa-matrix.md` 的 Evidence 块）

## Tests

- [ ]（可选）添加一个轻量脚本测试：验证输出非空且符合 URL 格式（不依赖网络）

## Edge cases & Failure modes

- WSL 环境下 IP 变化：
  - 脚本必须每次运行动态读取（不得写死）
- 端口冲突：
  - storybook:wsl 必须在冲突时给出可理解提示（storybook 本身会报错；RUN_LOG 要记录）

## Observability

- 该任务的“通过证据”就是 RUN_LOG：必须包含真实 URL 与抽查 stories 列表

## Manual QA (Storybook WSL-IP)

- [ ] 用 Windows 浏览器打开脚本输出 URL
- [ ] 随机抽查至少 5 个 stories（含 1 个 Layout、1 个 Dialog、1 个 Primitives）
- [ ] 证据写入 RUN_LOG（截图或录屏路径；格式见 Design 08）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
