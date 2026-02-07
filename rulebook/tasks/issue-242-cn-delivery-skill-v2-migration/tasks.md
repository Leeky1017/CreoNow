## 1. Implementation

- [x] 1.1 重写外部 Skill 为 CN 声明式规则
- [x] 1.2 更新 `docs/delivery-skill.md` 为唯一主源
- [x] 1.3 同步 `AGENTS.md` 相关条款
- [x] 1.4 更新 workflow 产出 canonical checks
- [x] 1.5 强化 `scripts/agent_pr_preflight.py` 的 Rulebook 校验
- [x] 1.6 新增规则映射矩阵文档

## 2. Validation

- [x] 2.1 workflow YAML 可解析
- [x] 2.2 目标文件 Prettier 校验通过
- [x] 2.3 branch protection required checks 回读验证
- [ ] 2.4 PR checks 全绿并确认 mergedAt

## 3. Delivery

- [x] 3.1 创建 PR（包含 `Closes #242`）
- [ ] 3.2 开启 auto-merge 并 watch checks
- [ ] 3.3 回填 RUN_LOG PR 链接与最终结果
