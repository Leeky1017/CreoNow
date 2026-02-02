# Input 组件生成卡片

## 元信息

- **优先级**: P0（黄金标准）
- **依赖**: 无
- **文件位置**: `components/primitives/Input/`
- **设计参考**: `34-component-primitives.html`

---

## 基础样式 (MUST)

```css
height: 40px;
padding: 0 12px;
background: var(--color-bg-surface);
border: 1px solid var(--color-border-default);
border-radius: var(--radius-sm);
font-size: 13px;
color: var(--color-fg-default);
```

---

## 状态矩阵 (MUST 全部实现)

| 状态          | 视觉表现                                             | 触发方式      |
| ------------- | ---------------------------------------------------- | ------------- |
| default       | 正常边框颜色                                         | 初始状态      |
| hover         | border-color: var(--color-border-hover)              | 鼠标悬停      |
| focus-visible | border-color: var(--color-border-focus) + focus ring | 聚焦          |
| error         | border-color: var(--color-error) + 底部错误文字      | 验证失败      |
| disabled      | opacity: 0.5, cursor: not-allowed, 不可聚焦          | disabled=true |
| readonly      | background: var(--color-bg-base), 可聚焦但不可编辑   | readOnly=true |

### disabled vs readonly 区别

| 属性     | 可聚焦 | 可编辑 | 表单提交  | 视觉                    |
| -------- | ------ | ------ | --------- | ----------------------- |
| disabled | ❌     | ❌     | ❌ 不包含 | 明显禁用 (opacity: 0.5) |
| readonly | ✅     | ❌     | ✅ 包含   | 轻微区分 (背景略淡)     |

---

## 边界情况 (MUST 处理)

| 边界        | 处理方式                          |
| ----------- | --------------------------------- |
| 超长输入    | 水平滚动，不换行                  |
| 空输入      | 显示 placeholder                  |
| 带前缀/后缀 | 支持 leftElement / rightElement   |
| 密码输入    | type="password" 支持显示/隐藏切换 |

---

## Props 接口

```typescript
interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  size?: "sm" | "md" | "lg";
  error?: boolean;
  errorMessage?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}
```

---

## 尺寸变体

| 尺寸 | 高度 | 字号 |
| ---- | ---- | ---- |
| sm   | 32px | 12px |
| md   | 40px | 13px |
| lg   | 48px | 14px |

---

## 禁止事项

- MUST NOT 硬编码颜色值
- MUST NOT 使用 any 类型
- MUST NOT 忽略 error 状态
- MUST NOT 让 disabled 输入框可编辑

---

## Cursor Prompt

```
创建 Input 组件，严格按照以下规范实现：

## 上下文文件（MUST 先读取）
1. design/system/01-tokens.css（Design Tokens）
2. design/system/02-component-cards/Input.md（本卡片）
3. design/reference-implementations/Button/（黄金标准参考）

## 要求
1. 文件结构：components/primitives/Input/ 目录下
   - Input.tsx（组件实现）
   - Input.types.ts（类型定义）
   - index.ts（导出）
   - Input.stories.tsx（Storybook Story）

2. 尺寸：sm / md / lg
3. 状态：default / hover / focus-visible / error / disabled / readonly

4. 样式：
   - 使用 Tailwind + cn() 工具函数
   - 所有颜色使用 CSS Variables
   - Focus 使用 outline + border 组合

5. 边界处理：
   - 支持 leftElement / rightElement
   - error 状态显示错误信息
   - placeholder 正确显示

## 验收标准
- 所有状态在 Storybook 中可见
- 类型完整，无 any
- 代码风格与 Button 一致
```

---

## 验收测试代码

```typescript
// Input.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input 验收', () => {
  // 基础渲染
  it('正确渲染默认状态', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  // 状态覆盖
  it.each(['sm', 'md', 'lg'] as const)('%s size 正确渲染', (size) => {
    render(<Input size={size} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // Error 状态
  it('error 状态显示错误信息', () => {
    render(<Input error errorMessage="Invalid input" />);
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
  });

  // Disabled 状态
  it('disabled 状态不可编辑', async () => {
    render(<Input disabled defaultValue="test" />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'new text');
    expect(input).toHaveValue('test');
  });

  // Focus 规范
  it('Tab 聚焦显示 focus ring', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');

    await userEvent.tab();
    expect(input).toHaveFocus();
  });

  // Left/Right Element
  it('支持 leftElement 和 rightElement', () => {
    render(
      <Input
        leftElement={<span data-testid="left">L</span>}
        rightElement={<span data-testid="right">R</span>}
      />
    );
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});
```

---

## AI 自检步骤

生成组件后，执行以下步骤：

1. 确保 Storybook 正在运行（端口 6006）
2. 使用 browser_navigate 打开组件 Story：
   http://localhost:6006/?path=/story/primitives-input--all-states
3. 使用 browser_snapshot 获取页面快照
4. 检查以下项目：
   - [ ] 所有 size 尺寸正确
   - [ ] 颜色符合设计规范
   - [ ] 间距符合 4px 网格
   - [ ] hover 状态边框变化
   - [ ] focus-visible 显示 focus ring + 边框变化
   - [ ] error 状态红色边框 + 错误信息
   - [ ] disabled 状态正确
5. 如有问题，修改代码后重复步骤 2-4
6. 自检通过后报告：
   "组件 Input 已通过 AI 可视化自检，请进行人工验收"
