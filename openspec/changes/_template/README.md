# Change Template（强制 TDD 先行）

用途：新建 `openspec/changes/<change-name>/` 时复制本目录结构。

强制规则：

1. `tasks.md` 必须保持 6 个固定章节顺序，不可删改章节名。
2. 必须先完成 `TDD Mapping` 与 `Red`，再进入 `Green`。
3. `proposal.md` 的 `审阅状态` 必须由 Owner 更新为 `APPROVED` 后再进入 Apply 阶段。
4. 当活跃 change ≥ 2 时，必须在 `openspec/changes/EXECUTION_ORDER.md` 维护执行模式、顺序、依赖、更新时间（`YYYY-MM-DD HH:mm`）。
5. 若当前 change 有上游依赖，进入 Red 前必须完成 `依赖同步检查（Dependency Sync Check）`，并将“无漂移/已更新”结果写入 `tasks.md` 与 RUN_LOG。
