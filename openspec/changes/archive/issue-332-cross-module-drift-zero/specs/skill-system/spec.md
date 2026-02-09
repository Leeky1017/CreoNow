# Skill System Specification Delta

## Change: issue-332-cross-module-drift-zero

### Requirement: 技能执行通道命名与 IPC 治理一致 [MODIFIED]

技能执行的 request-response 通道必须采用 3 段式命名：

- 执行触发：`ai:skill:run`
- 执行取消：`ai:skill:cancel`

流式推送保持 Skill 域语义：

- 增量：`skill:stream:chunk`
- 完成：`skill:stream:done`

#### Scenario: 执行与取消通道采用 canonical 名称 [MODIFIED] (S5)

- **假设** 用户触发技能并随后取消
- **当** 渲染进程发起调用
- **则** 触发通道为 `ai:skill:run`
- **并且** 取消通道为 `ai:skill:cancel`

#### Scenario: 流式完成状态通过 done 通道返回 [MODIFIED] (S6)

- **假设** 技能执行结束（成功/失败/取消）
- **当** 主进程推送终态事件
- **则** 通过 `skill:stream:done` 发送
- **并且** 包含可判定状态与错误信息（如有）
