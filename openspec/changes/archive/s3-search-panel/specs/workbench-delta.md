# Workbench Specification Delta

## Change: s3-search-panel

### Requirement: Search Panel 必须支持“查询-结果-跳转”闭环 [ADDED]

Workbench 搜索面板必须支持全文查询输入、结果展示与结果点击跳转，形成可验证的检索交互闭环。

#### Scenario: S3-SEARCH-PANEL-S1 输入查询后展示命中结果 [ADDED]

- **假设** 用户在 Search Panel 输入关键词
- **当** 系统完成检索
- **则** 面板展示命中结果列表（含标题与摘要）
- **并且** 结果项按既定顺序稳定渲染

#### Scenario: S3-SEARCH-PANEL-S2 点击结果后跳转到目标位置 [ADDED]

- **假设** 结果列表存在可点击命中项
- **当** 用户点击某条结果
- **则** 编辑器跳转到对应文档与命中位置
- **并且** 当前激活上下文更新为目标文档

### Requirement: Search Panel 状态呈现必须可区分且符合 Workbench 约定 [MODIFIED]

Search Panel 必须明确区分空结果、加载中、错误态，避免失败场景被误读为“无结果”。

#### Scenario: S3-SEARCH-PANEL-S3 空结果与错误态分离显示 [MODIFIED]

- **假设** 用户提交查询
- **当** 检索返回空集
- **则** 显示空结果提示
- **当** 检索请求失败
- **则** 显示错误提示与重试入口

## Out of Scope

- 检索索引或排序算法重写
- 搜索历史、过滤器等扩展功能
- IPC 通道命名与协议变更
