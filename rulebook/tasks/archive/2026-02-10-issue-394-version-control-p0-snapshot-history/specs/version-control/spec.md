# Spec Delta Reference: version-control (ISSUE-394)

## Scope

执行并交付 OpenSpec change `version-control-p0-snapshot-history`，不扩展到 p1/p2/p3/p4。

## References

- 主 spec: `openspec/specs/version-control/spec.md`
- 活跃 change: `openspec/changes/version-control-p0-snapshot-history`
- delta spec: `openspec/changes/version-control-p0-snapshot-history/specs/version-control-delta.md`
- tasks: `openspec/changes/version-control-p0-snapshot-history/tasks.md`

## Acceptance

- `version:snapshot:create/list/read` 契约可用，触发与 reason 语义符合 delta。
- autosave 在 5 分钟窗口内合并为 1 条快照，手动/AI 快照不被合并。
- 版本历史入口可通过文件右键、Info 面板链接、命令面板打开。
- 交付链证据齐全：RUN_LOG + preflight + required checks + auto-merge + main 收口。
