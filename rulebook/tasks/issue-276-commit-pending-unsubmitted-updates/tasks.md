## 1. Intake

- [x] 1.1 新建 OPEN Issue 与 `task/276-*` 分支
- [x] 1.2 枚举两处未提交内容（控制面 `main` + `task/273`）
- [x] 1.3 确保搬运策略不回滚、不删除任何用户内容

## 2. Consolidation

- [x] 2.1 将控制面未提交 OpenSpec 内容迁移到新分支
- [x] 2.2 将 `task/273` 未提交收尾文档迁移到新分支
- [x] 2.3 同步 `EXECUTION_ORDER.md` 以匹配当前活跃 changes

## 3. Validation

- [x] 3.1 Rulebook validate 通过
- [ ] 3.2 Preflight 通过
- [x] 3.3 RUN_LOG 记录完整并回填真实 PR 链接

## 4. Delivery

- [x] 4.1 提交并推送分支
- [x] 4.2 创建 PR（Closes #276）并启用 auto-merge
- [ ] 4.3 required checks 全绿后合并回 `main`
- [ ] 4.4 收口控制面并确认 `origin/main` 包含该提交
