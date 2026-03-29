import type { Meta, StoryObj } from '@storybook/react';
import { ProjectSwitcher } from './ProjectSwitcher';

const meta: Meta<typeof ProjectSwitcher> = {
  title: 'Composites/ProjectSwitcher',
  component: ProjectSwitcher,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-60 bg-sidebar p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
