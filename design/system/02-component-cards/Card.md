# Card 组件生成卡片

## 元信息

- **优先级**: P0（黄金标准）
- **依赖**: 无
- **文件位置**: `components/primitives/Card/`
- **设计参考**: `34-component-primitives.html`, `05-dashboard-sidebar-full.html`

---

## 基础样式 (MUST)

```css
background: var(--color-bg-surface);
border: 1px solid var(--color-border-default);
border-radius: var(--radius-xl);  /* 16px */
padding: var(--space-6);          /* 24px */
```

---

## 状态矩阵

| 状态 | 视觉表现 | 条件 |
|------|----------|------|
| default | 正常边框，无阴影 | 始终 |
| hover (可点击) | border-color: var(--color-border-hover), MAY --shadow-sm | interactive=true |
| selected | background: var(--color-bg-selected) | selected=true |
| disabled | opacity: 0.5 | disabled=true |

---

## 阴影使用规则 (MUST)

```
卡片.阴影 = 
  IF 卡片.可点击 AND 卡片.状态 == hover THEN MAY --shadow-sm
  ELSE MUST NOT 使用阴影
```

默认状态 **禁止使用阴影**，仅在 hover + 可点击时 **可选** 添加轻微阴影。

---

## Slot 模式

Card 组件应支持以下 slot：

| Slot | 用途 | 示例 |
|------|------|------|
| header | 卡片头部 | 标题 + 操作按钮 |
| children | 主内容区 | 任意内容 |
| footer | 卡片底部 | 元信息 + 操作按钮 |

---

## Props 接口

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否可点击（影响 hover 样式） */
  interactive?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 卡片头部 */
  header?: React.ReactNode;
  /** 卡片底部 */
  footer?: React.ReactNode;
  /** 内边距变体 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

---

## 内边距变体

| 变体 | 值 |
|------|-----|
| none | 0 |
| sm | var(--space-3) / 12px |
| md | var(--space-4) / 16px |
| lg | var(--space-6) / 24px |

---

## 边界情况 (MUST 处理)

| 边界 | 处理方式 |
|------|----------|
| 空内容 | 保持最小高度，显示占位 |
| 内容溢出 | 由使用方控制，Card 不强制 overflow |
| 嵌套 Card | 支持，内层使用更小的 padding |

---

## 禁止事项

- MUST NOT 默认使用阴影
- MUST NOT 硬编码颜色值
- MUST NOT 使用 any 类型
- MUST NOT 在非可点击卡片上添加 cursor: pointer

---

## Cursor Prompt

```
创建 Card 组件，严格按照以下规范实现：

## 上下文文件（MUST 先读取）
1. design/system/01-tokens.css（Design Tokens）
2. design/system/02-component-cards/Card.md（本卡片）
3. design/reference-implementations/Button/（黄金标准参考）

## 要求
1. 文件结构：components/primitives/Card/ 目录下
   - Card.tsx（组件实现）
   - Card.types.ts（类型定义）
   - index.ts（导出）
   - Card.stories.tsx（Storybook Story）

2. 支持 header / children / footer slot
3. 状态：default / hover (interactive) / selected / disabled

4. 样式：
   - 使用 Tailwind + cn() 工具函数
   - 所有颜色使用 CSS Variables
   - 默认无阴影，仅 hover + interactive 时 MAY 添加

5. 边界处理：
   - 空内容保持最小尺寸
   - 支持 padding 变体

## 验收标准
- 所有状态在 Storybook 中可见
- 类型完整，无 any
- 代码风格与 Button/Input 一致
```

---

## 验收测试代码

```typescript
// Card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';

describe('Card 验收', () => {
  // 基础渲染
  it('正确渲染内容', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  // Slot 渲染
  it('正确渲染 header 和 footer', () => {
    render(
      <Card 
        header={<div data-testid="header">Header</div>}
        footer={<div data-testid="footer">Footer</div>}
      >
        Content
      </Card>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  // Interactive 状态
  it('interactive 模式有 hover 样式', () => {
    render(<Card interactive>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass(/cursor-pointer/);
  });

  // 阴影规则
  it('默认不使用阴影', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as Element;
    const styles = getComputedStyle(card);
    // 检查是否无 box-shadow 或为 none
    expect(styles.boxShadow).toMatch(/^(none|)$/);
  });

  // Padding 变体
  it.each(['none', 'sm', 'md', 'lg'] as const)(
    'padding=%s 正确应用',
    (padding) => {
      render(<Card padding={padding}>Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    }
  );
});
```

---

## AI 自检步骤

生成组件后，执行以下步骤：

1. 确保 Storybook 正在运行（端口 6006）
2. 使用 browser_navigate 打开组件 Story：
   http://localhost:6006/?path=/story/primitives-card--all-variants
3. 使用 browser_snapshot 获取页面快照
4. 检查以下项目：
   - [ ] 圆角正确 (16px)
   - [ ] 边框正确
   - [ ] 颜色符合设计规范
   - [ ] 默认无阴影
   - [ ] interactive + hover 时边框变化
   - [ ] selected 状态背景变化
   - [ ] header/footer slot 正确渲染
5. 如有问题，修改代码后重复步骤 2-4
6. 自检通过后报告：
   "组件 Card 已通过 AI 可视化自检，请进行人工验收"
