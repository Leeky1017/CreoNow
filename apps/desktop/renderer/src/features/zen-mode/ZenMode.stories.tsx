import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ZenMode } from "./ZenMode";

/**
 * Real content from design spec (MUST use)
 */
const defaultContent = {
  title: "The Architecture of Silence",
  paragraphs: [
    "Intrigued by beauty, fascinated by technology and fueled with an everlasting devotion to digital craftsmanship.",
    "Design is not just about making things look good. It is about how things work. In the digital realm, this translates to the seamless integration of form and function. We build immersive environments where typography leads the eye and imagery sets the mood.",
    "The silence of a well-designed interface is not empty; it is full of potential. It is the breath between notes in a symphony, the white space that gives meaning to the ink. When we strip away the noise—the unnecessary borders, the decorative flourishes, the redundant controls—we are left with something pure.",
    "We find ourselves in a constant state of refinement. The goal is never to add more, but to take away until nothing else can be removed without breaking the essence. This is the paradox of modern design: it takes immense effort to make something appear effortless.",
    "Consider the cursor blinking on a blank page",
  ],
  showCursor: true,
};

const defaultStats = {
  wordCount: 1240,
  saveStatus: "Saved",
  readTimeMinutes: 6,
};

const meta: Meta<typeof ZenMode> = {
  title: "Features/ZenMode",
  component: ZenMode,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Fullscreen distraction-free writing mode with centered content, subtle glow effects, and minimal UI hints that appear on hover.",
      },
    },
  },
  args: {
    open: true,
    onExit: fn(),
    content: defaultContent,
    stats: defaultStats,
    currentTime: "11:32 PM",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ZenMode>;

/**
 * 1. DefaultZenMode - Default fullscreen zen mode
 *
 * Verifies:
 * - Fullscreen dark background (#050505)
 * - Content centered (horizontal and vertical)
 * - Text color (#888888 muted)
 * - Serif font (Georgia)
 * - Top/bottom hover areas hidden by default
 */
export const DefaultZenMode: Story = {
  name: "Default Zen Mode",
  args: {
    open: true,
    content: defaultContent,
    stats: defaultStats,
    currentTime: "11:32 PM",
  },
};

/**
 * 2. TypingWithCursor - Typing with blinking cursor
 *
 * Verifies:
 * - Cursor at the end of "hands."
 * - Cursor blinks at 1s interval
 * - Simulated new character input
 * - Cursor follows movement
 */
export const TypingWithCursor: Story = {
  name: "Typing With Cursor",
  args: {
    open: true,
    content: {
      title: "The Architecture of Silence",
      paragraphs: [
        "The rain fell in sheets, blurring the city lights into abstract rivers of color. She watched from the fourteenth floor, coffee growing cold in her hands.",
      ],
      showCursor: true,
    },
    stats: {
      wordCount: 847,
      saveStatus: "Saved",
      readTimeMinutes: 4,
    },
    currentTime: "11:32 PM",
  },
};

/**
 * 3. HoverTopShowExit - Mouse moves to top area
 *
 * Verifies:
 * - Exit button fades in (opacity 0 → 1)
 * - Button position at top-right
 * - X icon style
 *
 * Note: Hover the top area to see the exit button appear.
 */
export const HoverTopShowExit: Story = {
  name: "Hover Top Show Exit",
  args: {
    open: true,
    content: defaultContent,
    stats: defaultStats,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Move mouse to the top edge of the screen to see the exit button fade in. The exit button and 'Press Esc to exit' hint will appear.",
      },
    },
  },
};

/**
 * 4. HoverBottomShowStatus - Mouse moves to bottom area
 *
 * Verifies:
 * - Status bar fades in
 * - Shows "847 words"
 * - Shows time "11:32 PM"
 *
 * Note: Hover the bottom area to see the status bar appear.
 */
export const HoverBottomShowStatus: Story = {
  name: "Hover Bottom Show Status",
  args: {
    open: true,
    content: {
      ...defaultContent,
      showCursor: false,
    },
    stats: {
      wordCount: 847,
      saveStatus: "Saved",
      readTimeMinutes: 4,
    },
    currentTime: "11:32 PM",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Move mouse to the bottom edge of the screen to see the status bar become fully visible. It shows word count, save status, and read time.",
      },
    },
  },
};

/**
 * 5. ExitByEscape - ESC key to exit
 *
 * Verifies:
 * - Press ESC triggers onExit callback
 * - Exit animation (fade out)
 *
 * Note: Press ESC key to trigger the onExit callback.
 */
export const ExitByEscape: Story = {
  name: "Exit By Escape",
  args: {
    open: true,
    content: defaultContent,
    stats: defaultStats,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Press the ESC key to trigger the onExit callback. Check the Actions panel to see the callback being triggered.",
      },
    },
  },
};

/**
 * 6. ExitByClick - Click X button to exit
 *
 * Verifies:
 * - Hover top to show X button
 * - Click X triggers onExit callback
 *
 * Note: Hover the top area and click the X button.
 */
export const ExitByClick: Story = {
  name: "Exit By Click",
  args: {
    open: true,
    content: defaultContent,
    stats: defaultStats,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Hover the top area to show the X button, then click it to trigger the onExit callback. Check the Actions panel to see the callback being triggered.",
      },
    },
  },
};

/**
 * Closed state - ZenMode not visible
 */
export const Closed: Story = {
  name: "Closed State",
  args: {
    open: false,
    content: defaultContent,
    stats: defaultStats,
  },
  parameters: {
    docs: {
      description: {
        story: "When open is false, the ZenMode component renders nothing.",
      },
    },
  },
};

/**
 * Long content with scrolling
 */
export const LongContent: Story = {
  name: "Long Content With Scrolling",
  args: {
    open: true,
    content: {
      title: "The Architecture of Silence",
      paragraphs: [
        "Intrigued by beauty, fascinated by technology and fueled with an everlasting devotion to digital craftsmanship.",
        "Design is not just about making things look good. It is about how things work. In the digital realm, this translates to the seamless integration of form and function. We build immersive environments where typography leads the eye and imagery sets the mood.",
        "The silence of a well-designed interface is not empty; it is full of potential. It is the breath between notes in a symphony, the white space that gives meaning to the ink. When we strip away the noise—the unnecessary borders, the decorative flourishes, the redundant controls—we are left with something pure.",
        "We find ourselves in a constant state of refinement. The goal is never to add more, but to take away until nothing else can be removed without breaking the essence. This is the paradox of modern design: it takes immense effort to make something appear effortless.",
        "The architecture of silence is built on three pillars: restraint, rhythm, and resonance. Restraint in what we choose to show. Rhythm in how elements relate to each other. Resonance in how the whole speaks to those who experience it.",
        "Every pixel has purpose. Every transition tells a story. Every interaction builds trust. This is the language of modern interfaces—a vocabulary of subtle cues and gentle guidance.",
        "In this space between action and reaction, between input and output, we find the essence of user experience. It is not about what the system does, but how it makes people feel.",
        "The best interfaces disappear. They become extensions of thought, invisible servants of human intention. This invisibility is not absence—it is presence so perfect that it ceases to be noticed.",
        "Consider the cursor blinking on a blank page",
      ],
      showCursor: true,
    },
    stats: {
      wordCount: 2847,
      saveStatus: "Saved",
      readTimeMinutes: 12,
    },
    currentTime: "11:45 PM",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Long content demonstrates the hidden scrollbar behavior. Scroll down to see more content - the scrollbar is hidden for distraction-free writing.",
      },
    },
  },
};

/**
 * Unsaved changes
 */
export const UnsavedChanges: Story = {
  name: "Unsaved Changes",
  args: {
    open: true,
    content: {
      ...defaultContent,
      showCursor: true,
    },
    stats: {
      wordCount: 1243,
      saveStatus: "Unsaved",
      readTimeMinutes: 6,
    },
    currentTime: "11:35 PM",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows unsaved status in the bottom status bar.",
      },
    },
  },
};
