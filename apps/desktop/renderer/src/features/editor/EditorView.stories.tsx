import type { Meta, StoryObj } from '@storybook/react';
import { EditorView } from './EditorView';

const mockEditor = {
  getHTML: () => '<p>Hello world</p>',
} as unknown as Parameters<typeof EditorView>[0]['editor'];

const meta = {
  title: 'Features/EditorView',
  component: EditorView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[400px] bg-background flex">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditorView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    editor: mockEditor,
  },
};

export const NoEditor: Story = {
  args: {
    editor: null,
  },
};
