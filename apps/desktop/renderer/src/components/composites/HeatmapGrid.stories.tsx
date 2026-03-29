import type { Meta, StoryObj } from '@storybook/react';
import { HeatmapGrid } from './HeatmapGrid';

function generateMockData(): number[][] {
  const data: number[][] = [];
  for (let w = 0; w < 52; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(Math.floor(Math.random() * 5));
    }
    data.push(week);
  }
  return data;
}

const mockData = generateMockData();

const meta = {
  title: 'Composites/HeatmapGrid',
  component: HeatmapGrid,
  tags: ['autodocs'],
  argTypes: {
    data: { control: 'object', description: '52×7 intensity grid (0-4)' },
  },
  args: {
    data: mockData,
  },
} satisfies Meta<typeof HeatmapGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    data: Array.from({ length: 52 }, () => Array.from({ length: 7 }, () => 0)),
  },
};

export const Full: Story = {
  args: {
    data: Array.from({ length: 52 }, () => Array.from({ length: 7 }, () => 4)),
  },
};
