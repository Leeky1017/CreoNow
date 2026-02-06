## 1. Audit Mapping

- [x] 1.1 从 `Opus审计完整版.md` 提取并锁定 #1..#39 映射。
- [x] 1.2 建立 requirement 编号 `CNAUD-REQ-001..039`。
- [x] 1.3 校正优先级分布（P0=7, P1=17, P2=15）。

## 2. Code Verification

- [x] 2.1 逐类复核 AI/Editor/Data/Design/CI/Architecture 相关代码。
- [x] 2.2 为每条映射写入 `verification_status`（verified/stale/needs-recheck）。

## 3. OpenSpec Rewrite

- [x] 3.1 重写 spec 文档（含 requirements 与 execution waves）。
- [x] 3.2 重写 6 份主题 design 文档。
- [x] 3.3 重写 39 张 task cards 与索引。

## 4. Delivery Hygiene

- [x] 4.1 创建 `openspec/_ops/task_runs/ISSUE-238.md`。
- [ ] 4.2 执行 preflight（typecheck/lint/contract/test:unit）。
- [ ] 4.3 提交 PR 并启用 auto-merge。
