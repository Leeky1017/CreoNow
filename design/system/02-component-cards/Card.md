# Card 组件生成卡片

## 元信息

- **优先级**: P0（黄金标准）
- **依赖**: 无
- **文件位置**: `components/primitives/Card.tsx`
- **设计参考**: `34-component-primitives.html`, `05-dashboard-sidebar-full.html`
- **Storybook**: `Primitives/Card`
- **测试文件**: `Card.test.tsx`（42 个测试用例）

---

## 基础样式 (MUST)

```css
background: var(--color-bg-surface);
border: 1px solid var(--color-border-default);
border-radius: var(--radius-xl);  /* 16px */
padding: var(--space-6);          /* 24px，通过 p-6 实现 */
transition: all var(--duration-fast) var(--ease-default);
```

---

## 变体 (Variants)

| 类型 | 边框 | 阴影 | 用途 |
|------|------|------|------|
| default | 1px --color-border-default | 无 | 标准内容容器 |
| raised | 1px --color-border-default | --shadow-md | 悬浮/强调卡片 |
| bordered | 2px --color-border-default | 无 | 强调边框 |

---

## 状态矩阵

| 状态 | 视觉表现 | 条件 | CSS 类 |
|------|----------|------|--------|
| default | 正常边框，无阴影 | 始终 | - |
| hover (可点击) | 边框高亮 + 可选阴影 | hoverable=true | `cursor-pointer hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-sm)]` |

---

## 阴影使用规则 (MUST)

```
卡片.阴影 = 
  IF variant == "raised" THEN --shadow-md
  ELSE IF hoverable AND 状态 == hover THEN MAY --shadow-sm
  ELSE MUST NOT 使用阴影
```

- default/bordered variant **默认无阴影**
- raised variant **始终有阴影**
- hoverable 状态在 hover 时 **可选添加轻微阴影**

---

## Props 接口

```typescript
export type CardVariant = "default" | "raised" | "bordered";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 视觉样式变体 */
  variant?: CardVariant;
  /** 启用 hover 效果（边框高亮 + 可选阴影） */
  hoverable?: boolean;
  /** 移除内边距，用于自定义布局 */
  noPadding?: boolean;
  /** 卡片内容 */
  children: React.ReactNode;
}
```

---

## Slot 模式

Card 使用 children 作为唯一 slot，支持任意内容组合：

```tsx
<Card>
  {/* Header 区域 */}
  <div className="flex justify-between mb-4 pb-3 border-b">
    <h3>Title</h3>
    <button>...</button>
  </div>
  
  {/* Content 区域 */}
  <p>Main content</p>
  
  {/* Footer 区域 */}
  <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
    <Button>Cancel</Button>
    <Button variant="primary">Save</Button>
  </div>
</Card>
```

---

## 边界情况 (MUST 处理)

| 边界 | 处理方式 | 测试覆盖 |
|------|----------|----------|
| 空内容 | 保持正常渲染 | ✅ |
| 内容溢出 | 由使用方控制 | ✅ |
| 嵌套 Card | 支持 | ✅ |
| Emoji | 正确显示 | ✅ |
| 超长文本 | 正常渲染 | ✅ |

---

## 禁止事项

- MUST NOT 在 default/bordered variant 默认使用阴影
- MUST NOT 硬编码颜色值（使用 CSS Variables）
- MUST NOT 使用 any 类型
- MUST NOT 在非 hoverable 卡片上添加 cursor: pointer

---

## Cursor Prompt

```
创建 Card 组件，严格按照以下规范实现：

## 上下文文件（MUST 先读取）
1. design/system/01-tokens.css（Design Tokens）
2. design/system/02-component-cards/Card.md（本卡片）

## 要求
1. 文件：components/primitives/Card.tsx

2. 变体：default / raised / bordered
3. 状态：default / hover (hoverable)

4. 样式：
   - 使用 Tailwind + className 拼接
   - 所有颜色使用 CSS Variables
   - 默认无阴影（除 raised），仅 hoverable + hover 时 MAY 添加

5. 边界处理：
   - 支持 noPadding 移除内边距
   - 支持嵌套 Card

## 验收标准
- 所有变体在 Storybook 中可见
- 类型完整，无 any
- 代码风格与 Button/Input 一致
```

---

## 验收测试代码

完整测试位于 `Card.test.tsx`，共 42 个测试用例，覆盖：

```typescript
describe('Card', () => {
  describe('渲染')           // 基础渲染测试
  describe('variants')       // 3 种 variant 全覆盖
  describe('hoverable')      // hover 状态测试
  describe('padding')        // 内边距测试
  describe('样式')           // 圆角、背景、过渡
  describe('阴影规则')       // 设计规范 §5.2
  describe('CSS Variables')  // 禁止硬编码颜色
  describe('交互')           // onClick 响应
  describe('Slot 模式')      // children 渲染
  describe('边界情况')       // 空内容、超长文本、emoji、嵌套
  describe('Variant × Hoverable 矩阵')  // 6 种组合
  describe('无障碍')         // a11y 测试
});
```

---

## AI 自检步骤

生成组件后，执行以下步骤：

1. 运行测试验证功能正确：
   ```bash
   pnpm --filter desktop test -- --run Card.test.tsx
   ```
   期望：42 个测试全部通过

2. 确保 Storybook 正在运行：
   ```bash
   pnpm --filter desktop storybook
   ```

3. 使用 browser_navigate 打开组件 Story：
   `http://localhost:6006/?path=/story/primitives-card--full-matrix`

4. 使用 browser_snapshot 获取页面快照，检查以下项目：
   - [ ] 圆角正确 (16px / --radius-xl)
   - [ ] 边框正确（default 1px, bordered 2px）
   - [ ] 颜色符合设计规范（使用 CSS Variables）
   - [ ] default variant 无阴影
   - [ ] raised variant 有阴影
   - [ ] hoverable 时有 cursor-pointer
   - [ ] hoverable + hover 时边框变化 + 可选阴影
   - [ ] noPadding 正确移除内边距

5. 自检通过后报告：
   "组件 Card 已通过 AI 可视化自检，请进行人工验收"

---

## 自检记录

**日期**: 2026-02-01

### 测试验证

| 检查项 | 状态 | 验证方式 |
|--------|------|----------|
| 测试通过 | ✅ | 42/42 tests passed |
| CSS Variables | ✅ | 测试验证无硬编码颜色 |
| Variant × Hoverable 矩阵 | ✅ | 6 种组合全覆盖 |
| 边界情况 | ✅ | 空内容、超长文本、emoji、嵌套 |
| 无障碍 | ✅ | role、aria-label、键盘操作 |

### 可视化验证（Storybook MCP 浏览器）

| 检查项 | 状态 | 验证方式 |
|--------|------|----------|
| 3 种 Variants 渲染 | ✅ | Full Matrix Story 截图 |
| 圆角正确 (16px) | ✅ | 可视化确认 |
| 边框正确 | ✅ | default 1px, bordered 2px |
| default 无阴影 | ✅ | 可视化确认 |
| raised 有阴影 | ✅ | 可视化确认明显阴影效果 |
| hoverable 样式 | ✅ | Hoverable Story 截图 |
| Slot 模式 | ✅ | With Slots Story：Header + Content + Footer |
| 实际使用场景 | ✅ | Project Card Scenario：中文内容、元信息布局 |

### 验证截图

1. **Full Matrix Story** - 展示所有 Variants 和 Hoverable 状态
2. **Hoverable Story** - 展示可点击卡片的 hover 提示
3. **With Slots Story** - 展示 Header/Content/Footer 布局
4. **Project Card Scenario** - 展示真实项目卡片场景

**结论**: 组件 Card 已通过 AI 可视化自检（测试覆盖 + Storybook 可视化验证），请进行人工验收。
