# Skill System Specification Delta

更新时间：2026-02-23 23:06

## Change: issue-617-scoped-lifecycle-and-abort

### Requirement: 会话级并发槽位必须在 timeout/abort/异常路径可回收 [ADDED]

技能系统的会话级资源（并发槽位、队列占用等）**必须**在异常路径可回收，避免出现“槽位永久占用导致全局阻塞”。

- 当任务因 timeout/abort/异常未能正常 settle（completion 丢失）时，系统仍必须回收并发槽位。
- 该回收行为必须可被自动化测试验证。
- 若同时推进 `issue-617-skill-runtime-hardening`，其 BE-SRH-S3/S4 作为更强约束应满足并覆盖本 Requirement，禁止实现两套相互冲突的回收逻辑。

#### Scenario: BE-SLA-S3 会话并发槽位在 timeout/abort 下可回收 [ADDED]

- **假设** 某个会话级调度器为任务占用了并发槽位
- **当** 任务因 timeout/abort/异常导致 completion 丢失或未正常 settle
- **则** 系统仍能回收该并发槽位并允许后续任务继续排队执行
- **并且** 不会出现“槽位永久占用导致全局阻塞”
