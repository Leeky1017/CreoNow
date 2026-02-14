## 1. Implementation

- [ ] 1.1 对照 `docs/plans/unified-roadmap.md` 的 Sprint0 内容，提取每个 change 的踩坑提醒与防治标签
- [ ] 1.2 在 8 个 `s0-*/proposal.md` 补齐 `踩坑提醒` 与 `防治标签` 段
- [ ] 1.3 校验补丁不改变 Requirement/Scenario 语义与依赖拓扑

## 2. Testing

- [ ] 2.1 运行 Prettier 检查补丁文件格式
- [ ] 2.2 运行 `scripts/agent_pr_preflight.sh` 并修复阻断项
- [ ] 2.3 确认 required checks 全绿并 auto-merge

## 3. Documentation

- [ ] 3.1 更新 RUN_LOG 记录命令证据与阻断修复过程
- [ ] 3.2 完成主会话审计签字并收口到控制面 `main`
