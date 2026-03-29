import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

const meta = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
        <CardDescription>Manage your project configuration.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">
          Configure your project name, description, and other metadata here.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
};
