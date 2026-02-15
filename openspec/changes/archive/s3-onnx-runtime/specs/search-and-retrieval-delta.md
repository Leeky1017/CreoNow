# Search & Retrieval Specification Delta

## Change: s3-onnx-runtime

### Requirement: 向量嵌入运行时必须支持 ONNX Runtime 本地推理 [MODIFIED]

系统必须在主进程内提供可复现的 ONNX Runtime 嵌入推理路径，作为语义搜索和 RAG 的稳定输入来源。

#### Scenario: S3-ONNX-S1 ONNX Runtime 成功初始化并生成有效向量 [MODIFIED]

- **假设** 本地 ONNX 模型与 provider 配置有效
- **当** 系统执行一次 `embedding:generate`
- **则** 返回向量维度与模型声明一致
- **并且** 返回语义与既有嵌入契约兼容（可被 `embedding:search` 直接消费）

### Requirement: ONNX 运行时错误必须显式返回并可观测 [ADDED]

系统必须为模型加载失败、会话初始化失败、维度不匹配提供显式错误语义和结构化日志，禁止静默成功。

#### Scenario: S3-ONNX-S2 模型加载失败返回确定性错误 [ADDED]

- **假设** 模型文件缺失或不可读取
- **当** 运行时尝试初始化 ONNX 会话
- **则** 返回错误码 `EMBEDDING_RUNTIME_UNAVAILABLE`
- **并且** 记录包含 `provider`、`modelPath`、`error` 的结构化日志

#### Scenario: S3-ONNX-S3 维度不匹配时阻断错误向量进入检索链路 [ADDED]

- **假设** 运行时输出向量维度与配置声明不一致
- **当** 系统准备写入或消费该向量
- **则** 返回错误码 `EMBEDDING_DIMENSION_MISMATCH`
- **并且** 不将错误向量注入语义搜索/RAG

## Out of Scope

- Hybrid RAG 排序公式与重排权重调整
- Renderer 搜索交互与展示层改造
- 新增第三方云端 embedding provider
