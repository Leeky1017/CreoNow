# Version Control Specification Delta

## Change: version-control-p4-save-contract-drift-fix

### Requirement: File Save IPC Response Contract Alignment [MODIFIED]

`file:document:save` IPC 响应必须与主进程实际返回结构一致。若保存链路会返回 `compaction` 信息，契约必须显式声明该字段为可选，避免运行时校验将其作为非法额外字段。

#### Scenario: file:document:save returns compaction payload without validation rejection [ADDED]

- **假设** 文档保存触发了快照压缩并返回 `compaction`
- **当** 渲染进程调用 `file:document:save`
- **则** IPC runtime validation 通过
- **并且** 响应中的 `compaction` 字段可被渲染进程读取

#### Scenario: Contract regression guard for save compaction field [ADDED]

- **假设** 开发者修改 IPC contract
- **当** 运行 `document-ipc-contract` 契约测试
- **则** 测试验证 `file:document:save` 响应包含可选 `compaction`
- **并且** 若字段缺失则测试失败
