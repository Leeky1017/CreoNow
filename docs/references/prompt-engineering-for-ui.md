# UI Prompt 工程指南

> **前置阅读**：`AGENTS.md`（必读）→ `frontend-visual-quality.md` → 本文档
> **用途**：指导 Agent 精确生成符合 CreoNow 视觉标准的 UI 代码。
> **何时阅读**：需要用自然语言描述 UI 需求、编写组件规范、或理解非技术人员视觉反馈时。

---

## 一、五级 Prompt 精度模型

| 级别 | 精度 | 描述 | 适用场景 |
|------|------|------|---------|
| L1 | 粗略 | 「做一个按钮」 | 原型草图 |
| L2 | 基本 | 「做一个主操作按钮，圆角，蓝色背景」 | 快速验证 |
| L3 | 精确 | 指定 Token、状态、尺寸、间距 | 日常开发 |
| L4 | 严格 | 附带 Figma 截图 + Token 表 + 组件规范卡片 | 正式交付 |
| L5 | 参考级 | L4 + 具体动效/响应式/深浅主题细节 | 核心组件 |

### L3+ Prompt 必须包含的信息

```
1. 组件名称和用途
2. 使用的 Design Token（颜色、间距、圆角、阴影）
3. 交互状态（hover / focus / active / disabled）
4. 复用哪些已有 Primitive
5. i18n key（`t('namespace.key')`）
```

---

## 二、Prompt 五项黄金原则

| # | 原则 | 要点 |
|---|------|------|
| 1 | **Token 优先** | 用 Token 名称而非色值描述颜色/间距 |
| 2 | **状态完整** | 始终列举所有交互状态 |
| 3 | **复用声明** | 明确指出使用哪个 Primitive/Composite |
| 4 | **示例驱动** | 给出理想效果的截图或参考 URL |
| 5 | **验收可测** | 给出 Storybook / 测试级别的验收标准 |

---

## 三、实用 Prompt 模板

### 模板 1：新组件

```markdown
## 需求：[组件名]

### 用途
[一句话说明此组件在哪个场景使用]

### 设计规范
- 背景色：`var(--color-bg-surface)`
- 文字色：`var(--color-fg-default)`
- 间距：`var(--space-3)` padding
- 圆角：`var(--radius-md)`
- 阴影：`var(--shadow-sm)`

### 交互状态
- hover：背景切换到 `var(--color-bg-hover)`，过渡 `var(--duration-fast) var(--ease-default)`
- focus-visible：焦点环 `var(--ring-focus-width) var(--ring-focus-color)`
- disabled：`opacity: 0.5, pointer-events: none`

### 复用
- 基于 `primitives/Button` 扩展
- 图标使用 `lucide-react`

### i18n
- 按钮文案：`t('feature.actionLabel')`
- tooltip：`t('feature.actionTooltip')`

### Story
- 需要 default / hover / disabled 三个 Story
```

### 模板 2：修改现有组件

```markdown
## 修改：[组件路径]

### 当前问题
[描述视觉或行为问题，最好附截图]

### 期望效果
[描述修改后的视觉或行为，最好附截图或参考]

### 修改点
1. [具体修改内容，使用 Token 名称]
2. [具体修改内容]

### 验证
- [ ] Storybook 预览正确
- [ ] Dark/Light 主题正常
- [ ] 原有测试通过
```

### 模板 3：页面级布局

```markdown
## 页面：[页面名]

### 布局
- 结构：[描述区域划分]
- 主容器：`max-width` + `var(--space-*)` padding
- 区域间距：`var(--space-4)` gap

### 组件组合
- 头部：复用 `composites/PanelHeader`
- 列表：复用 `primitives/List` + `primitives/ListItem`
- 空状态：复用 `composites/EmptyState`

### 响应式（如需要）
- 断点：`sm(640px)` / `md(768px)` / `lg(1024px)`
- 移动端布局变化：[描述]
```

---

## 四、组件规范卡片模板（简化版）

一个完整的组件规范卡片包含：

```markdown
# ComponentName

## Token 映射
| 属性 | Token |
|------|-------|
| bg   | var(--color-bg-surface) |
| fg   | var(--color-fg-default) |
| ...  | ... |

## 变体
| 变体 | 差异 |
|------|------|
| primary | accent 背景 |
| ghost | 透明背景 |

## 状态
default → hover → focus → active → disabled → loading

## 尺寸
sm / md / lg → 对应 padding / font-size / height

## 无障碍
role / aria-label / 键盘导航
```

---

## 五、常见反馈→Prompt 转换

| 用户反馈 | 转换为 Prompt |
|---------|--------------|
| 「这个按钮太大了」 | `height: var(--size-sm)`, `padding: var(--space-1) var(--space-2)`, `font-size: var(--text-sm)` |
| 「这块区域太空了」 | 减小 `gap`/`padding`，从 `--space-4` 降到 `--space-2` |
| 「字看不清」 | 确认对比度 ≥ 4.5:1，使用 `var(--color-fg-default)` 而非 `--color-fg-muted` |
| 「hover 没反应」 | 添加 `hover:bg-[var(--color-bg-hover)]` + `transition var(--duration-fast)` |
| 「不像我们的风格」 | 检查 Token 使用、圆角(md)、阴影(subtle)、Font(Inter) |
| 「太花了」 | 减少颜色种类、统一到 `--color-fg-default` + `--color-accent` |

---

## 六、Prompt 质量自检

写完 Prompt 后检查：

- [ ] 是否指定了 Token 名称而非硬编码值？
- [ ] 是否声明了所有交互状态？
- [ ] 是否指明了复用哪些 Primitive？
- [ ] 是否使用了 `t()` i18n 而非裸字符串？
- [ ] 是否有验收标准？
