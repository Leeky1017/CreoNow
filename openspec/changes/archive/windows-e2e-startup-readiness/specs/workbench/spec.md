# Workbench Specification Delta

## Change: windows-e2e-startup-readiness

### Requirement: 命令面板（Command Palette） [MODIFIED]

命令面板执行命令后，必须在测试可观察层面满足「目标对话框可见且命令面板已关闭」的顺序一致性，避免跨测试残留状态导致后续快捷键用例误判。

#### Scenario: 命令执行后焦点落在目标对话框且命令面板已关闭 [MODIFIED]

- **假设** 用户通过 `Cmd/Ctrl+P` 打开命令面板
- **当** 用户执行 `Settings` 或 `Export` 命令
- **则** 命令面板关闭
- **并且** 目标对话框可见并接收后续键盘输入

#### Scenario: 快捷键用例间无残留弹窗状态 [ADDED]

- **假设** 同一测试文件内连续执行多个快捷键用例
- **当** 进入下一条用例前执行状态清理
- **则** `settings-dialog`、`export-dialog`、`create-project-dialog` 均关闭
- **并且** 下一条用例打开命令面板时可稳定定位 `Search commands` 输入框
