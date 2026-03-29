import type { Meta, StoryObj } from '@storybook/react';
import { EditorErrorBoundary } from './EditorErrorBoundary';

function NormalChild() {
  return (
    <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border text-foreground">
      <p className="text-sm">编辑器内容正常加载</p>
    </div>
  );
}

function ThrowingChild(): never {
  throw new Error('Test error: Editor crashed');
}

const meta: Meta<typeof EditorErrorBoundary> = {
  title: 'Features/EditorErrorBoundary',
  component: EditorErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  render: () => (
    <div className="w-[600px]">
      <EditorErrorBoundary>
        <NormalChild />
      </EditorErrorBoundary>
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-[600px] h-64">
      <EditorErrorBoundary>
        <ThrowingChild />
      </EditorErrorBoundary>
    </div>
  ),
};
