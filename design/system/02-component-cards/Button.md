# Button 组件生成卡片

## 元信息

- **优先级**: P0（黄金标准）
- **依赖**: 无
- **文件位置**: `components/primitives/Button/`
- **设计参考**: `34-component-primitives.html`

---

## 变体 (Variants)

| 类型 | 背景 | 文字 | 边框 | 用途 |
|------|------|------|------|------|
| primary | --color-fg-default | --color-fg-inverse | 无 | 主要操作 |
| secondary | transparent | --color-fg-default | 1px --color-border-default | 次要操作 |
| ghost | transparent | --color-fg-muted | 无 | 轻量操作 |
| danger | transparent | --color-error | 1px --color-error | 危险操作 |

---

## 尺寸 (Sizes)

| 尺寸 | 高度 | 水平内边距 | 字号 | 圆角 |
|------|------|------------|------|------|
| sm | 28px | 12px | 12px | --radius-sm |
| md | 36px | 16px | 13px | --radius-md |
| lg | 44px | 20px | 14px | --radius-md |

---

## 状态矩阵 (MUST 全部实现)

| 状态 | 视觉表现 | 行为 | 触发方式 |
|------|----------|------|----------|
| default | 正常颜色 | 可点击 | 初始状态 |
| hover | opacity: 0.9 (Primary) / 边框变化 (Secondary) | cursor: pointer | 鼠标悬停 |
| active | 背景加深 | 按下反馈 | 鼠标按下 |
| focus-visible | 显示 focus ring | - | Tab 键聚焦 |
| disabled | opacity: 0.5 | cursor: not-allowed, 不可点击 | disabled=true |
| loading | 显示 Spinner，隐藏文字 | 不可点击 | loading=true |

---

## 边界情况 (MUST 处理)

| 边界 | 处理方式 |
|------|----------|
| 文字过长 | 使用 text-ellipsis 截断，设置 max-width |
| 无文字（icon-only） | 需要 aria-label，正方形按钮 |
| 极窄容器 | min-width 保证可用 |
| 同时有 icon 和文字 | gap: 8px 分隔 |

---

## 禁止事项

- MUST NOT 硬编码颜色值
- MUST NOT 使用 any 类型
- MUST NOT 在 hover 时使用 translateY（避免布局漂移）
- MUST NOT 让 loading 状态仍可点击

## 特例 - 允许 translateY 的场景 (MAY)

仅在以下条件全部满足时，MAY 在 hover 时使用 translateY：

- 仅限 Hero 区域的大按钮 (lg + Primary)
- 仅限单独放置、周围有足够空间的按钮
- 列表中的按钮 MUST NOT 使用位移效果

```typescript
// 示例：Hero 按钮可以使用
<Button variant="primary" size="lg" className="hero-cta">
  开始创作
</Button>

// 错误：列表中的按钮禁止使用
<ul>
  {items.map(item => (
    <li>
      <Button>删除</Button> {/* 禁止 translateY */}
    </li>
  ))}
</ul>
```

---

## Props 接口

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 视觉样式变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 显示加载状态并禁用交互 */
  loading?: boolean;
  /** 全宽按钮 */
  fullWidth?: boolean;
  /** 按钮内容 */
  children: React.ReactNode;
}
```

> **注意**: leftIcon/rightIcon 功能通过 children 支持 React 节点实现，如 `<Button><Icon /> Text</Button>`

---

## Cursor Prompt

```
创建 Button 组件，严格按照以下规范实现：

## 上下文文件（MUST 先读取）
1. design/system/01-tokens.css（Design Tokens）
2. design/system/02-component-cards/Button.md（本卡片）

## 要求
1. 文件结构：components/primitives/Button/ 目录下
   - Button.tsx（组件实现）
   - Button.types.ts（类型定义）
   - index.ts（导出）
   - Button.stories.tsx（Storybook Story）

2. 变体：primary / secondary / ghost / danger
3. 尺寸：sm / md / lg
4. 状态：default / hover / active / focus-visible / disabled / loading

5. 样式：
   - 使用 Tailwind + cn() 工具函数
   - 所有颜色使用 CSS Variables
   - Focus 使用 outline 实现

6. 边界处理：
   - 超长文本截断
   - icon-only 模式需要 aria-label
   - loading 时禁用点击

## 验收标准
- 所有状态在 Storybook 中可见
- 类型完整，无 any
- 代码风格一致
```

---

## 验收测试代码

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button 验收', () => {
  // CSS Variables 检查
  it('所有颜色使用 CSS Variables', () => {
    const { container } = render(<Button>Test</Button>);
    const styles = getComputedStyle(container.firstChild as Element);
    // 检查是否使用了 CSS Variables
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  // 状态覆盖
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    '%s variant 正确渲染',
    (variant) => {
      render(<Button variant={variant}>Test</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  );

  // Loading 状态
  it('loading 状态禁用点击', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Test</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // Disabled 状态
  it('disabled 状态不可点击', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Test</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // Focus 规范
  it('Tab 聚焦显示 focus ring', async () => {
    render(<Button>Test</Button>);
    const button = screen.getByRole('button');
    
    await userEvent.tab();
    expect(button).toHaveFocus();
    // focus-visible 样式检查
  });

  // Icon-only 需要 aria-label
  it('icon-only 模式有 aria-label', () => {
    render(<Button aria-label="Close" leftIcon={<span>X</span>} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Close');
  });
});
```

---

## AI 自检步骤

生成组件后，执行以下步骤：

1. 确保 Storybook 正在运行（端口 6006）
2. 使用 browser_navigate 打开组件 Story：
   http://localhost:6006/?path=/story/primitives-button--all-variants
3. 使用 browser_snapshot 获取页面快照
4. 检查以下项目：
   - [ ] 所有 variant 正确渲染
   - [ ] 所有 size 尺寸正确
   - [ ] 颜色符合设计规范（纯白/深灰强调色）
   - [ ] 间距符合 4px 网格
   - [ ] hover 状态有反馈
   - [ ] focus-visible 显示 focus ring
   - [ ] disabled 和 loading 状态正确
5. 如有问题，修改代码后重复步骤 2-4
6. 自检通过后报告：
   "组件 Button 已通过 AI 可视化自检，请进行人工验收"
