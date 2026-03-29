import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, FileText, Flame, FolderOpen } from 'lucide-react';
import { KPICard } from './KPICard';

const meta = {
  title: 'Composites/KPICard',
  component: KPICard,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'KPI label text' },
    value: { control: 'text', description: 'KPI value' },
    trend: { control: 'object', description: 'Trend indicator' },
  },
  args: {
    label: '今日字数',
    value: '2,340',
  },
} satisfies Meta<typeof KPICard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTrendUp: Story = {
  args: {
    label: '本周字数',
    value: '12,580',
    trend: { direction: 'up', percentage: 23 },
    icon: <Pencil size={16} strokeWidth={1.5} />,
  },
};

export const WithTrendDown: Story = {
  args: {
    label: '今日字数',
    value: '480',
    trend: { direction: 'down', percentage: 12 },
  },
};

export const WithTrendFlat: Story = {
  args: {
    label: '连续写作天数',
    value: '7',
    trend: { direction: 'flat', percentage: 0 },
    icon: <Flame size={16} strokeWidth={1.5} />,
  },
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 max-w-3xl">
      <KPICard
        label="今日字数"
        value="2,340"
        trend={{ direction: 'up', percentage: 15 }}
        icon={<Pencil size={16} strokeWidth={1.5} />}
      />
      <KPICard
        label="本周字数"
        value="12,580"
        trend={{ direction: 'up', percentage: 23 }}
        icon={<FileText size={16} strokeWidth={1.5} />}
      />
      <KPICard
        label="连续天数"
        value="7"
        trend={{ direction: 'flat', percentage: 0 }}
        icon={<Flame size={16} strokeWidth={1.5} />}
      />
      <KPICard
        label="总文档数"
        value="42"
        icon={<FolderOpen size={16} strokeWidth={1.5} />}
      />
    </div>
  ),
};
