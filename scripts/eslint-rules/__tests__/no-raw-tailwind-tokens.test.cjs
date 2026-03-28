// @ts-nocheck — ESLint RuleTester is JS-only
/**
 * Comprehensive tests for creonow/no-raw-tailwind-tokens
 *
 * Covers:
 *   - Shaded color utilities (bg-red-600, text-gray-300)
 *   - Named raw color utilities (text-white, bg-black)
 *   - Modifier prefixes (hover:text-white, focus:bg-black)
 *   - Allowlist mechanism (opt-out for intentional exceptions)
 *   - Stories file code (rule should apply equally)
 *   - Shadow @theme exports (should NOT flag)
 */
const { RuleTester } = require("eslint");
const rule = require("../no-raw-tailwind-tokens.cjs");

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// ── Shaded color utilities (existing behavior) ─────────────────────
tester.run("no-raw-tailwind-tokens — shaded colors", rule, {
  valid: [
    // Semantic token usage
    { code: `const cls = "text-foreground";` },
    { code: `const cls = "bg-surface";` },
    { code: `const cls = "border-muted";` },
    // CSS variable reference
    { code: `const cls = "shadow-[var(--shadow-card)]";` },
    // @theme-exported shadow utilities
    { code: `const cls = "shadow-xs";` },
    { code: `const cls = "shadow-sm";` },
    { code: `const cls = "shadow-lg";` },
    { code: `const cls = "shadow-xl";` },
    { code: `const cls = "shadow-2xl";` },
    { code: `const cls = "hover:shadow-lg";` },
    // Non-color utilities
    { code: `const cls = "text-lg";` },
    { code: `const cls = "text-sm";` },
    { code: `const cls = "bg-gradient-to-r";` },
  ],
  invalid: [
    {
      code: `const cls = "bg-red-600";`,
      errors: [{ messageId: "rawColor" }],
    },
    {
      code: `const cls = "text-gray-300";`,
      errors: [{ messageId: "rawColor" }],
    },
    {
      code: `const cls = "hover:bg-red-600";`,
      errors: [{ messageId: "rawColor" }],
    },
    {
      code: `const cls = "border-blue-500";`,
      errors: [{ messageId: "rawColor" }],
    },
    {
      code: `const cls = \`shadow-red-500/20\`;`,
      errors: [{ messageId: "rawColor" }],
    },
  ],
});

// ── Named raw color utilities (new behavior) ───────────────────────
tester.run("no-raw-tailwind-tokens — named raw colors", rule, {
  valid: [
    // Semantic tokens that happen to contain "white"/"black" as a substring
    // but are NOT the raw utility pattern
    { code: `const cls = "whitespace-nowrap";` },
    { code: `const cls = "blackout-overlay";` },
    // bg-transparent / text-transparent are CSS keywords, not design colors
    { code: `const cls = "bg-transparent";` },
    { code: `const cls = "text-transparent";` },
    { code: `const cls = "border-transparent";` },
    // "current" color
    { code: `const cls = "text-current";` },
    { code: `const cls = "border-current";` },
    // "inherit"
    { code: `const cls = "text-inherit";` },
  ],
  invalid: [
    {
      code: `const cls = "text-white";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "text-black";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "bg-white";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "bg-black";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "border-white";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "border-black";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "ring-white";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "ring-black";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    // With modifier prefixes
    {
      code: `const cls = "hover:text-white";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "focus:bg-black";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    // With opacity suffix
    {
      code: `const cls = "bg-black/50";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    {
      code: `const cls = "text-white/80";`,
      errors: [{ messageId: "rawNamedColor" }],
    },
    // In template literals
    {
      code: "const cls = `bg-white ${x}`;",
      errors: [{ messageId: "rawNamedColor" }],
    },
  ],
});

// ── Allowlist mechanism ────────────────────────────────────────────
tester.run("no-raw-tailwind-tokens — allowlist", rule, {
  valid: [
    // Allowlisted named colors should pass
    {
      code: `const cls = "text-white";`,
      options: [{ allowlist: ["text-white"] }],
    },
    {
      code: `const cls = "bg-black";`,
      options: [{ allowlist: ["bg-black"] }],
    },
    // Allowlisted shaded colors should pass
    {
      code: `const cls = "bg-red-600";`,
      options: [{ allowlist: ["bg-red-600"] }],
    },
    // Allowlist with modifier — the base value is matched
    {
      code: `const cls = "hover:text-white";`,
      options: [{ allowlist: ["text-white"] }],
    },
  ],
  invalid: [
    // Non-allowlisted value still flags
    {
      code: `const cls = "text-white bg-black";`,
      options: [{ allowlist: ["text-white"] }],
      errors: [{ messageId: "rawNamedColor" }],
    },
    // Allowlist doesn't apply to different patterns
    {
      code: `const cls = "bg-red-600";`,
      options: [{ allowlist: ["text-white"] }],
      errors: [{ messageId: "rawColor" }],
    },
  ],
});

// ── Stories file code (rule applies equally) ───────────────────────
tester.run("no-raw-tailwind-tokens — stories coverage", rule, {
  valid: [
    // Story with semantic tokens — fine
    {
      code: `
        export const Default = {
          render: () => <div className="bg-surface text-foreground">Story</div>,
        };
      `,
    },
  ],
  invalid: [
    // Story with raw shaded color
    {
      code: `
        export const Default = {
          render: () => <div className="bg-red-500">Story</div>,
        };
      `,
      errors: [{ messageId: "rawColor" }],
    },
    // Story with raw named color
    {
      code: `
        export const Default = {
          render: () => <div className="text-white bg-black">Story</div>,
        };
      `,
      errors: [
        { messageId: "rawNamedColor" },
        { messageId: "rawNamedColor" },
      ],
    },
  ],
});

// ── Violation type in error message ────────────────────────────────
tester.run("no-raw-tailwind-tokens — error messages include violation type", rule, {
  valid: [],
  invalid: [
    {
      code: `const cls = "bg-red-600";`,
      errors: [
        {
          messageId: "rawColor",
          data: { value: "bg-red-600" },
        },
      ],
    },
    {
      code: `const cls = "text-white";`,
      errors: [
        {
          messageId: "rawNamedColor",
          data: { value: "text-white" },
        },
      ],
    },
  ],
});

console.log("✅ no-raw-tailwind-tokens: all tests passed");
