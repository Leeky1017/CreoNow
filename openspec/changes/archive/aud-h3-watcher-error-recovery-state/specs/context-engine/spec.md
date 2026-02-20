# context-engine Specification Delta

## Change: aud-h3-watcher-error-recovery-state

### Requirement: watcher `error` 必须确定性回收状态并发布 invalidation 信号（Wave0 / H3）[ADDED]

系统必须确保 watcher 出错时状态不漂移且可恢复，至少满足：

- 出错后必须关闭 watcher 实例。
- 出错后 `isWatching(projectId)` 必须回到 `false`。
- 必须向上层发布 `onWatcherInvalidated({ projectId, reason: "error" })`，用于触发重试或重建。

#### Scenario: CE-AUD-H3-S1 watcher error 必须清理 watch 状态并触发 invalidation [ADDED]

- **假设** 某 project 的 watcher 已 start 且 `isWatching(projectId) == true`
- **当** watcher 触发 `error`
- **则** `isWatching(projectId)` 必须变为 `false`
- **并且** watcher 必须被关闭
- **并且** `onWatcherInvalidated` 必须收到 `{ projectId, reason: "error" }`
