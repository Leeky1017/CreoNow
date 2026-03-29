import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './HoverCard';
import { Avatar, AvatarFallback } from './Avatar';

const meta = {
  title: 'Primitives/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="text-sm font-medium text-accent underline cursor-pointer">
          @creonow
        </button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">CreoNow</p>
            <p className="text-xs text-muted-foreground">
              AI-powered creative writing IDE.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
