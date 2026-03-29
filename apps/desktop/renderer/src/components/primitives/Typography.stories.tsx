import type { Meta, StoryObj } from '@storybook/react';
import { Heading, Text, Caption } from './Typography';

const meta = {
  title: 'Primitives/Typography',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Headings: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Heading as="h1">Heading 1 — 2xl</Heading>
      <Heading as="h2">Heading 2 — xl</Heading>
      <Heading as="h3">Heading 3 — lg</Heading>
      <Heading as="h4">Heading 4 — base</Heading>
      <Heading as="h5">Heading 5 — sm</Heading>
      <Heading as="h6">Heading 6 — xs</Heading>
    </div>
  ),
};

export const BodyText: Story = {
  render: () => (
    <Text>
      CreoNow is a creative writing IDE built for modern creators.
      It combines the precision of a code editor with the fluidity of a writing tool.
    </Text>
  ),
};

export const CaptionText: Story = {
  render: () => <Caption>Last updated 3 minutes ago</Caption>,
};
