# Context Engine Specification Delta

更新时间：2026-02-23 23:06

## Change: issue-617-scoped-lifecycle-and-abort

### Requirement: 项目解绑必须清理 Context Engine 的 project-scoped cache/watcher [ADDED]

Context Engine 中与项目绑定的资源（project-scoped cache、watcher/订阅等）**必须**在项目切换的 unbind 阶段完成释放，避免跨项目污染、句柄泄漏或残留事件流。

- unbind 完成后，不得继续接收或处理来自旧项目的事件。
- 清理行为必须可被自动化测试验证。

#### Scenario: BE-SLA-S4 项目解绑时清理 project-scoped cache/watcher [ADDED]

- **假设** 项目 A 运行期间创建了 project-scoped 缓存与文件 watcher/订阅
- **当** 项目 A 被切换离开并执行 unbind
- **则** 缓存与 watcher/订阅 被释放/清空
- **并且** 不再继续接收来自项目 A 的事件或占用文件句柄
