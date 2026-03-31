import type { Meta, StoryObj } from '@storybook/react'
import {
  CnDialog,
  CnDialogTrigger,
  CnDialogContent,
  CnDialogHeader,
  CnDialogTitle,
  CnDialogDescription,
  CnDialogBody,
  CnDialogFooter,
  CnDialogClose,
} from '@/components/ui/cn-dialog'
import { CnButton } from '@/components/ui/cn-button'

const meta = {
  title: 'UI/CnDialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/*  BaseDialog                                                         */
/* ------------------------------------------------------------------ */

export const BaseDialog: Story = {
  render: () => (
    <CnDialog>
      <CnDialogTrigger render={<CnButton variant="primary">Open Dialog</CnButton>} />
      <CnDialogContent>
        <CnDialogHeader>
          <CnDialogTitle>Confirm Action</CnDialogTitle>
          <CnDialogDescription>Are you sure you want to proceed?</CnDialogDescription>
        </CnDialogHeader>
        <div className="border-t border-cn-separator" />
        <CnDialogBody>
          This action will apply the changes you&apos;ve made. Once confirmed, the operation cannot
          be undone. Please review your changes carefully before proceeding.
        </CnDialogBody>
        <CnDialogFooter>
          <CnDialogClose render={<CnButton variant="ghost">Cancel</CnButton>} />
          <CnDialogClose render={<CnButton variant="primary">Confirm</CnButton>} />
        </CnDialogFooter>
      </CnDialogContent>
    </CnDialog>
  ),
}

/* ------------------------------------------------------------------ */
/*  WithCloseButton                                                    */
/* ------------------------------------------------------------------ */

export const WithCloseButton: Story = {
  render: () => (
    <CnDialog>
      <CnDialogTrigger render={<CnButton variant="primary">Open Dialog</CnButton>} />
      <CnDialogContent showCloseButton>
        <CnDialogHeader>
          <CnDialogTitle>Confirm Action</CnDialogTitle>
          <CnDialogDescription>Are you sure you want to proceed?</CnDialogDescription>
        </CnDialogHeader>
        <div className="border-t border-cn-separator" />
        <CnDialogBody>
          This dialog has an X button in the top-right corner. You can close it by clicking the X,
          pressing Escape, or clicking the overlay.
        </CnDialogBody>
        <CnDialogFooter>
          <CnDialogClose render={<CnButton variant="ghost">Cancel</CnButton>} />
          <CnDialogClose render={<CnButton variant="primary">Confirm</CnButton>} />
        </CnDialogFooter>
      </CnDialogContent>
    </CnDialog>
  ),
}

/* ------------------------------------------------------------------ */
/*  LongContent                                                        */
/* ------------------------------------------------------------------ */

export const LongContent: Story = {
  render: () => (
    <CnDialog>
      <CnDialogTrigger render={<CnButton variant="primary">Open Dialog</CnButton>} />
      <CnDialogContent showCloseButton>
        <CnDialogHeader>
          <CnDialogTitle>Terms of Service</CnDialogTitle>
          <CnDialogDescription>Please read the following terms carefully.</CnDialogDescription>
        </CnDialogHeader>
        <div className="border-t border-cn-separator" />
        <CnDialogBody scrollable>
          <div className="flex flex-col gap-cn-3">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
              officia deserunt mollit anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
              laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
              architecto beatae vitae dicta sunt explicabo.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
              consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro
              quisquam est, qui dolorem ipsum quia dolor sit amet.
            </p>
            <p>
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
              voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint
              occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt
              mollitia animi, id est laborum et dolorum fuga.
            </p>
            <p>
              Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum
              soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat
              facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
            </p>
          </div>
        </CnDialogBody>
        <CnDialogFooter>
          <CnDialogClose render={<CnButton variant="ghost">Decline</CnButton>} />
          <CnDialogClose render={<CnButton variant="primary">Accept</CnButton>} />
        </CnDialogFooter>
      </CnDialogContent>
    </CnDialog>
  ),
}

/* ------------------------------------------------------------------ */
/*  SingleAction                                                       */
/* ------------------------------------------------------------------ */

export const SingleAction: Story = {
  render: () => (
    <CnDialog>
      <CnDialogTrigger render={<CnButton variant="primary">Open Dialog</CnButton>} />
      <CnDialogContent>
        <CnDialogHeader>
          <CnDialogTitle>Information</CnDialogTitle>
          <CnDialogDescription>Your changes have been saved successfully.</CnDialogDescription>
        </CnDialogHeader>
        <div className="border-t border-cn-separator" />
        <CnDialogBody>
          All modifications have been applied and synced. You can continue working on your project.
        </CnDialogBody>
        <CnDialogFooter>
          <CnDialogClose render={<CnButton variant="primary">OK</CnButton>} />
        </CnDialogFooter>
      </CnDialogContent>
    </CnDialog>
  ),
}
