# Knowledge Graph Specification Delta

## Change: knowledge-graph-p1-visualization-extended-views

### Dependency

本 change 依赖 `knowledge-graph-p0-entity-relation-query` 已合并到控制面 `main`。未满足依赖前不得进入实现阶段。

### Requirement: 可视化关系图 [MODIFIED]

KG-2 必须在左侧 Icon Bar 的 `graph` 入口提供可交互关系图。

技术选型（本 change 固定）：

- 布局引擎：`d3-force`
- 交互：`d3-zoom`（缩放/平移）+ 节点拖拽行为
- 渲染层可使用 SVG 或 Canvas，但必须保留与 `d3-force` 解耦的 adapter

视觉与交互契约（与 `DESIGN_DECISIONS.md` 对齐）：

- 节点颜色：`--color-node-*`
- 连线颜色：`--color-fg-subtle`
- 背景：`--color-bg-base`
- Tooltip 内容：实体名称 + 类型
- 支持节点拖拽、缩放和平移

Storybook 覆盖（关系图组件）：

- `graph-multi-node`
- `graph-minimal`
- `graph-empty`

#### Scenario: KG2-R1-S1 关系图展示项目实体 [MODIFIED]

- **假设** 项目中存在多个实体与关系
- **当** 用户点击 Icon Bar 的 `graph` 入口
- **则** Sidebar 展示力导向关系图
- **并且** 节点颜色与实体类型一一对应
- **并且** 连线中部显示关系类型标签

#### Scenario: KG2-R1-S2 关系图空状态 [MODIFIED]

- **假设** 当前项目无实体
- **当** 用户打开知识图谱面板
- **则** 显示空状态文案「暂无实体，点击添加你的第一个角色或地点」
- **并且** 提供「添加节点」按钮

#### Scenario: KG2-R1-S3 节点拖拽与缩放 [MODIFIED]

- **假设** 关系图中已渲染多个节点
- **当** 用户拖拽任一节点到新位置并执行滚轮缩放
- **则** 节点与连线实时重绘
- **并且** 缩放以鼠标位置为中心
- **并且** 拖拽/缩放状态写入本地视图偏好

### Requirement: 扩展视图——时间线与角色卡 [MODIFIED]

KG-2 必须在 `character` 入口与 KG 面板标签中提供时间线与角色卡扩展视图。

时间线契约：

- 横轴为虚拟时间（章节顺序，如 `Chapter-01 -> Chapter-02`）
- 事件节点颜色使用 `--color-node-event`
- 支持拖拽调整事件顺序并落盘章节序
- 点击事件节点可跳转事件详情页

角色卡契约：

- 卡片结构：头像占位区 + 名称 + 类型标签 + 关键属性列表 + 关系摘要
- 卡片样式：`--color-bg-surface` + `--color-border-default` + `--radius-xl`
- 入口：Icon Bar `character`

Storybook 覆盖（角色卡组件）：

- `character-card-complete`
- `character-card-partial`
- `character-card-empty`

#### Scenario: KG2-R2-S1 时间线视图按章节展示并支持拖拽调整 [MODIFIED]

- **假设** 项目中存在多个事件实体且已关联章节
- **当** 用户切换到时间线标签
- **则** 事件节点按章节顺序渲染在横轴上
- **并且** 拖拽后顺序变化可持久化

#### Scenario: KG2-R2-S2 角色卡列表展示角色摘要 [MODIFIED]

- **假设** 项目中存在多个角色实体
- **当** 用户点击 Icon Bar 的 `character` 入口
- **则** Sidebar 展示角色卡列表
- **并且** 每张卡片展示名称、类型标签、关键属性与关系摘要
- **并且** 点击卡片打开角色详情页

#### Scenario: KG2-R2-S3 角色卡空状态 [MODIFIED]

- **假设** 项目中没有角色实体
- **当** 用户打开 `character` 入口
- **则** 显示空状态文案「暂无角色，开始创建你的第一个角色」
- **并且** 提供「创建角色」按钮

### Requirement: 模块级可验收标准（KG-2 渲染层子集） [MODIFIED]

KG-2 作为渲染层 change，必须满足：

- Graph/Timeline/CharacterCard 均有 Storybook 场景覆盖
- 颜色、背景、边框、圆角全部引用 design token，禁止硬编码
- 不新增数据层异常处理分支，数据合法性由 KG-1 保障

#### Scenario: KG2-A-S1 关系图与角色卡 Storybook 覆盖完整 [MODIFIED]

- **假设** 运行 Storybook 场景检查
- **当** 检查关系图三态与角色卡三态
- **则** 六个场景均可渲染并通过快照基线
- **并且** 不出现硬编码颜色值

### Requirement: 异常与边界覆盖矩阵（KG-2 相关） [MODIFIED]

KG-2 不新增网络/IO、并发冲突、容量溢出、权限安全场景；该类异常由 KG-1 的数据契约与错误码统一保障。KG-2 仅处理渲染降级（空态/占位态）而不扩展数据层错误语义。

## Out of Scope

- 自动识别建议与 AI 续写注入。
- 查询性能优化与数据层重构。
- Context Engine / AI Service 的真实对接。
