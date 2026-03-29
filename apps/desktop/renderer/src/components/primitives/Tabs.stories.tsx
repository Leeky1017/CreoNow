import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

const meta = {
  title: 'Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="tab1">General</TabsTrigger>
        <TabsTrigger value="tab2">Editor</TabsTrigger>
        <TabsTrigger value="tab3">Creo</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <div className="rounded-lg border border-border p-4 text-sm text-foreground">
          General settings content.
        </div>
      </TabsContent>
      <TabsContent value="tab2">
        <div className="rounded-lg border border-border p-4 text-sm text-foreground">
          Editor configuration options.
        </div>
      </TabsContent>
      <TabsContent value="tab3">
        <div className="rounded-lg border border-border p-4 text-sm text-foreground">
          Creo assistant preferences.
        </div>
      </TabsContent>
    </Tabs>
  ),
};
