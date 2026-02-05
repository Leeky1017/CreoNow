# ISSUE-186
- Issue: #186
- Branch: task/186-storybook-wsl-qa-gate
- PR: https://github.com/Leeky1017/CreoNow/pull/187

## Plan
- 添加 `storybook:wsl` script 到 package.json（绑定 0.0.0.0）
- 创建 `scripts/wsl_storybook_url.sh`（动态输出 WSL IP 与访问 URL）
- 更新设计文档 04/08，固化证据格式与快速启动命令

## Runs
### 2026-02-05 验证脚本输出
- Command: `./scripts/wsl_storybook_url.sh`
- Key output:
  ```
  WSL IP: 172.18.248.30
  Storybook URL: http://172.18.248.30:6006
  ```
- Evidence:
  - 脚本成功动态获取 WSL IP（不写死）
  - 输出格式固定（WSL IP + Storybook URL）
  - Notes: 端口可通过 STORYBOOK_PORT 环境变量自定义
