import type { Meta, StoryObj } from '@storybook/react';
import { TooltipProvider } from '@/components/primitives';
import { HeatmapGrid } from './HeatmapGrid';

function generateMockData(): Array<{ date: string; count: number }> {
  const data: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rand = Math.random();
    let count = 0;
    if (rand > 0.3) count = Math.floor(Math.random() * 500);
    if (rand > 0.7) count = Math.floor(Math.random() * 2000) + 500;
    if (rand > 0.9) count = Math.floor(Math.random() * 3000) + 2000;
    data.push({ date: dateStr, count });
  }
  return data;
}

const meta: Meta<typeof HeatmapGrid> = {
  title: 'Composites/HeatmapGrid',
  component: HeatmapGrid,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="w-[720px] p-4 bg-background">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HeatmapGrid>;

export const Default: Story = {
  args: {
    data: generateMockData(),
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};

export const Sparse: Story = {
  args: {
    data: generateMockData().filter((_, i) => i % 5 === 0),
  },
};
