# Document Management Specification Delta

## Change: s1-doc-service-extract

### Requirement: DocumentService 必须完成职责提取并保持门面契约稳定 [ADDED]

系统必须将 `documentService` 的内部实现从单体函数拆分为可独立维护的子服务，并保持对外契约不变。

- 必须提取出 `documentCrudService`、`versionService`、`branchService` 三个子服务工厂 [ADDED]
- 必须新增文档模块共享类型文件作为单一类型来源 [ADDED]
- `documentService` 必须保留为聚合门面，对外暴露的方法签名、返回结构与错误语义不得变化 [ADDED]
- 已提取职责的旧实现必须从门面文件移除，禁止以复制粘贴形式保留双实现路径 [ADDED]

#### Scenario: S1-DSE-S1 完成子服务提取并形成独立职责边界 [ADDED]

- **假设** `documentService` 承担 CRUD、版本、分支等多职责
- **当** 执行 `s1-doc-service-extract` 的结构提取
- **则** `documentCrudService`、`versionService`、`branchService` 分别承载对应实现
- **并且** 门面层不再直接承载完整业务实现细节

#### Scenario: S1-DSE-S2 门面委托后对外契约保持不变 [ADDED]

- **假设** 渲染层与 IPC 仍通过既有 `DocumentService` 契约调用文档能力
- **当** 请求经 `documentService` 门面转发到子服务
- **则** 对外方法签名、返回结构与错误语义保持与提取前一致
- **并且** 现有文档管理行为测试无需因接口破坏而重写

#### Scenario: S1-DSE-S3 删除旧实现避免复制粘贴双链路 [ADDED]

- **假设** 已将版本/分支/CRUD 逻辑提取到子服务
- **当** 检查 `documentService` 与子服务实现边界
- **则** 提取前旧实现分支已删除，不再保留并行旧路径
- **并且** 不存在同职责在门面与子服务双份实现导致的行为漂移风险

## Out of Scope

- 新增文档业务功能或 IPC 通道
- 变更 Renderer 端交互与文件树 UX
- 引入超出 `documentService` 拆分范围的跨模块重构
