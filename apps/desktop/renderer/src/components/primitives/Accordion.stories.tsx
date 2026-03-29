import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';

const meta = {
  title: 'Primitives/Accordion',
  component: Accordion,
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FAQ: Story = {
  args: { type: 'single' as const },
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is CreoNow?</AccordionTrigger>
        <AccordionContent>
          CreoNow is an AI-powered creative writing IDE, designed as "Cursor for creators".
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How does the AI assist writing?</AccordionTrigger>
        <AccordionContent>
          The AI provides contextual suggestions, style matching, and intelligent editing
          capabilities to enhance your writing workflow.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is my data secure?</AccordionTrigger>
        <AccordionContent>
          Yes. All your documents are stored locally on your device. We take privacy seriously
          and never share your content.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
