# Workbench Specification Delta

## Change: workbench-p5-05-hardening-gate

### Requirement: 模块级可验收标准 [MODIFIED]

落地 zod 校验与非法偏好回退：

- `layoutStore` 输入参数**必须**经 zod schema 校验 [ADDED 实现]：
  - `sidebarWidth`: `z.number().min(180).max(400).default(240)`
  - `panelWidth`: `z.number().min(280).max(480).default(320)`
  - `sidebarCollapsed`: `z.boolean().default(false)`
  - `panelCollapsed`: `z.boolean().default(false)`
  - `activeLeftPanel`: `z.enum(["files","search","outline","versionHistory","memory","characters","knowledgeGraph"]).default("files")`
  - `activeRightPanel`: `z.enum(["ai","info","quality"]).default("ai")`
- `themeStore` 输入参数**必须**经 zod schema 校验 [MODIFIED]：
  - `mode`: `z.enum(["dark","light","system"]).default("system")`
  - 替代现有手写 `normalizeMode` 函数
- zod 校验失败时**必须**回退默认值 + 写入修正值到 preferences + 状态栏一次性提示 [ADDED]

#### Scenario: layoutStore zod 校验与回退 [ADDED]

- **假设** 持久化层读到 `sidebarWidth: -100`（非法值）
- **当** 应用启动恢复布局
- **则** zod 校验失败，`sidebarWidth` 回退为默认值 240
- **并且** 修正值写入 preferences
- **并且** 状态栏显示一次性提示「布局已重置」

#### Scenario: themeStore zod 校验与写回 [MODIFIED]

- **假设** 持久化层读到 `theme=neon`（非法值）
- **当** 应用加载主题
- **则** zod 校验失败，回退 `system`
- **并且** 修正值 `system` 写入 preferences（消除反复回退问题）
- **并且** 不产生白屏或闪烁

---

### Requirement: 主题切换 [MODIFIED]

补齐「跟随系统」实现：

- `system` 模式下**必须**监听 `matchMedia('(prefers-color-scheme: dark)')` [ADDED 实现]
- OS 切换深色/浅色时，应用**必须**自动跟随 [ADDED 实现]
- 监听器在主题模式切换为非 `system` 时**必须**注销 [ADDED]

#### Scenario: 主题跟随系统自动切换 [ADDED]

- **假设** 用户选择了「跟随系统」主题模式，当前 OS 为深色
- **当** OS 从深色切换到浅色
- **则** 应用自动切换为浅色主题（`data-theme="light"`）
- **并且** 无需用户手动操作
- **并且** 切回 OS 深色时应用自动跟随

---

### Requirement: 全局快捷键 [MODIFIED]

补齐并发去抖：

- `Cmd/Ctrl+L`、`Cmd/Ctrl+\` 等布局快捷键**必须**有 300ms debounce [ADDED 实现]
- 300ms 内多次按压只执行一次状态翻转 [ADDED 实现]

#### Scenario: 并发快捷键去抖 [ADDED]

- **假设** 用户快速连按 `Cmd/Ctrl+L`
- **当** 事件在 300ms 内多次到达
- **则** 系统去抖处理，只执行一次面板状态翻转
- **并且** UI 最终状态可预测

---

### Requirement: 左侧 Sidebar 面板 [MODIFIED]

补齐 Resizer 悬停样式与双拖拽处理：

- 悬停时分割线**必须**变为 2px 高亮 + `cursor: col-resize` [ADDED 实现]
- 双面板同时拖拽时**必须**采用 last-write-wins 策略 [ADDED 实现]

#### Scenario: Resizer 悬停样式 [ADDED]

- **假设** 用户鼠标接近分割线
- **当** 鼠标进入 8px 可点击区域
- **则** 分割线从 1px 变为 2px 高亮
- **并且** 光标变为 `col-resize`

#### Scenario: 双拖拽 last-write-wins [ADDED]

- **假设** 用户几乎同时拖拽左侧栏和右侧栏分割线
- **当** 两个更新事件进入布局 store
- **则** 全局 dragging flag 确保同一时刻只有一个 Resizer 活跃
- **并且** 宽度仍受最小/最大边界约束

---

### Requirement: 右侧面板 [MODIFIED]

补齐折叠按钮：

- 右侧面板内**必须**有折叠按钮（除 `Cmd/Ctrl+L` 外的第二种折叠方式）[ADDED]

#### Scenario: 右侧面板折叠按钮 [ADDED]

- **假设** 右侧面板处于展开状态
- **当** 用户点击面板内的折叠按钮
- **则** 右侧面板动画收起至 0px
- **并且** 折叠状态持久化

---

### Requirement: activeLeftPanel 持久化 [ADDED]

- `activeLeftPanel` **必须**持久化到 `creonow.layout.activeLeftPanel` [ADDED]
- 应用重启后恢复上次选择的左侧面板

#### Scenario: activeLeftPanel 持久化与恢复 [ADDED]

- **假设** 用户将左侧面板切换到 `knowledgeGraph`
- **当** 应用重启
- **则** 左侧面板恢复为 `knowledgeGraph`
- **并且** 若持久化值非法，回退默认值 `files`

---

### Non-Functional Requirements [MODIFIED]

NFR 验收阈值落地：

| 指标             | Spec 要求   | 验证方式                         |
| ---------------- | ----------- | -------------------------------- |
| 布局初始化 TTI   | p95 < 1.2s  | Playwright + `performance.now()` |
| 侧栏展开/折叠    | p95 < 220ms | Playwright 动画帧测量            |
| 命令面板唤起     | p95 < 120ms | Playwright                       |
| 命令面板检索     | p95 < 200ms | 单元测试 + 计时                  |
| 最近项目列表上限 | 200         | 单元测试                         |
| 命令面板单次返回 | 300（分页） | 单元测试                         |

---

### Requirement: 命令面板输入校验 [ADDED]

- `CommandPalette` 接收的 `commands` 列表**必须**经 zod schema 校验 [ADDED]
- `commandItemSchema`: `z.object({ id: z.string().min(1), label: z.string().min(1), group: z.string().optional(), category: z.enum(["recent","file","command"]).optional(), shortcut: z.string().optional(), subtext: z.string().optional() })`
- 校验失败的 command item **必须**被静默过滤，不影响其余合法项

#### Scenario: commandPalette zod 输入校验 [ADDED]

- **假设** 外部传入一组 command items，其中部分 id 或 label 为空
- **当** CommandPalette 渲染
- **则** 非法项被过滤，仅合法项展示
- **并且** 默认命令列表全部通过校验

---

## Out of Scope

- 核心功能逻辑变更
- 新增功能特性
- Owner 固定的快捷键映射或布局约束值调整
