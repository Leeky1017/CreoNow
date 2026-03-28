import type { Meta, StoryObj } from '@storybook/react';
import { EditorToolbar } from './EditorToolbar';

const mockEditor = {
  isActive: () => false,
  chain: () => ({
    focus: () => ({
      toggleBold: () => ({ run: () => {} }),
      toggleItalic: () => ({ run: () => {} }),
      toggleHeading: () => ({ run: () => {} }),
      toggleBulletList: () => ({ run: () => {} }),
      toggleOrderedList: () => ({ run: () => {} }),
    }),
  }),
} as unknown as Parameters<typeof EditorToolbar>[0]['editor'];

const mockEditorWithActive = {
  ...mockEditor,
  isActive: (type: string) => type === 'bold',
} as unknown as Parameters<typeof EditorToolbar>[0]['editor'];

const meta = {
  title: 'Features/EditorToolbar',
  component: EditorToolbar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    editor: mockEditor,
  },
};

export const WithBoldActive: Story = {
  args: {
    editor: mockEditorWithActive,
  },
};

export const NoEditor: Story = {
  args: {
    editor: null,
  },
};
