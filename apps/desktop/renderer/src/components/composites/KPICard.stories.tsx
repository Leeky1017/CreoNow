import type { Meta, StoryObj } from '@storybook/react';
import { PenLine, BarChart3, FolderOpen, Flame } from 'lucide-react';
import { KPICard } from './KPICard';

const meta: Meta<typeof KPICard> = {
  title: 'Composites/KPICard',
  component: KPICard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KPICard>;

export const Default: Story = {
  args: {
    label: 'Today Words',
    value: '1,280',
    icon: PenLine,
  },
};

export const WithTrendUp: Story = {
  args: {
    label: 'Weekly Words',
    value: '8,450',
    icon: BarChart3,
    trend: { value: 12, direction: 'up' },
  },
};

export const WithTrendDown: Story = {
  args: {
    label: 'Active Projects',
    value: 3,
    icon: FolderOpen,
    trend: { value: 5, direction: 'down' },
  },
};

export const Streak: Story = {
  args: {
    label: 'Writing Streak',
    value: 14,
    icon: Flame,
  },
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 w-[480px]">
      <KPICard label="Today Words" value="1,280" icon={PenLine} trend={{ value: 12, direction: 'up' }} />
      <KPICard label="Weekly Words" value="8,450" icon={BarChart3} trend={{ value: 8, direction: 'up' }} />
      <KPICard label="Active Projects" value={3} icon={FolderOpen} />
      <KPICard label="Writing Streak" value={14} icon={Flame} trend={{ value: 5, direction: 'down' }} />
    </div>
  ),
};
