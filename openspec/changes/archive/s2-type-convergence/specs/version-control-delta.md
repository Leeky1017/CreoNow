# Version Control Specification Delta

## Change: s2-type-convergence

### Requirement: VersionListItem 类型定义必须收敛到单一来源 [MODIFIED]

版本历史相关 UI 必须使用同一个 `VersionListItem` 类型源，且消费方不得在本地重复声明等价结构：

- `VersionHistoryContainer` 必须通过导入使用单一来源 `VersionListItem`。
- `VersionHistoryContainer` 文件内不得出现本地 `type/interface VersionListItem` 声明。
- 类型字段变更只能在单一来源处发生，再由消费方被动收敛。

#### Scenario: 版本历史容器使用导入类型而非本地重定义 [ADDED]

- **假设** 开发者更新版本历史容器实现
- **当** 检查 `VersionHistoryContainer` 的类型声明
- **则** `VersionListItem` 来源为导入类型
- **并且** 文件内不存在本地同名类型定义

#### Scenario: 单一来源字段变化可被消费方直接感知 [ADDED]

- **假设** 单一来源 `VersionListItem` 新增或调整字段
- **当** 执行 TypeScript 类型检查
- **则** 版本历史容器根据导入类型直接收敛
- **并且** 不需要同步维护第二份本地类型定义

## Out of Scope

- 版本历史展示样式、排序策略与交互流程
- 版本快照存储结构与 IPC 协议
