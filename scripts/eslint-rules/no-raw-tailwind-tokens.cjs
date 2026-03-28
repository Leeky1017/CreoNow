/**
 * Custom ESLint rule: no-raw-tailwind-tokens
 *
 * Forbids raw Tailwind color values in ANY string literal or template literal.
 *
 * Two categories of violations:
 *
 * 1. **Shaded color utilities** (rawColor):
 *    bg-red-600, text-gray-300, border-blue-500, ring-emerald-200, etc.
 *    Also with modifiers (hover:bg-red-600) and opacity (bg-red-600/50).
 *
 * 2. **Named raw color utilities** (rawNamedColor):
 *    text-white, text-black, bg-white, bg-black, border-white, etc.
 *    These bypass the design token system by using CSS named colors directly.
 *
 * Allowed exceptions:
 *   - shadow-xs/sm/md/lg/xl/2xl — exported via @theme, map to design tokens
 *   - bg-transparent, text-transparent — CSS keyword, not a design color
 *   - text-current, border-current — CSS keyword
 *   - text-inherit — CSS keyword
 *   - Explicit allowlist via rule options
 *
 * Coverage: applies to all .ts/.tsx files including *.stories.tsx.
 * The lint-ratchet runner uses `--ext .ts,.tsx` which includes stories.
 *
 * @see docs/references/design-ui-architecture.md
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow raw Tailwind color values in any string literal. Use semantic Design Tokens instead.",
    },
    messages: {
      rawColor:
        "[shaded-color] Avoid raw Tailwind color '{{value}}'. Use a semantic Design Token instead. See docs/references/design-ui-architecture.md.",
      rawNamedColor:
        "[named-color] Avoid raw Tailwind color '{{value}}'. Use a semantic Design Token (e.g. text-foreground, bg-surface) instead. See docs/references/design-ui-architecture.md.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowlist: {
            type: "array",
            items: { type: "string" },
            description:
              "Explicit list of raw color utilities to allow (e.g. ['text-white'] for a known exception). The base utility without modifier prefix is matched.",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const allowlist = new Set(options.allowlist || []);

    // ── Pattern 1: Shaded color utilities ──────────────────────────
    // Matches: bg-red-600, text-gray-300, border-blue-500, etc.
    // Also matches modifier prefixes: hover:bg-red-600
    // Also matches opacity suffixes: shadow-red-500/20
    const RAW_COLOR_RE =
      /\b(?:([\w-]*):)?(?:bg|text|border|ring|shadow|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration)-(?:red|blue|green|yellow|purple|pink|indigo|violet|cyan|teal|emerald|lime|amber|orange|fuchsia|rose|sky|slate|gray|zinc|neutral|stone|warm)-\d{1,3}(?:\/\d{1,3})?\b/g;

    // ── Pattern 2: Named raw color utilities ───────────────────────
    // Matches: text-white, bg-black, border-white, ring-black, etc.
    // Does NOT match: bg-transparent, text-current, text-inherit (CSS keywords)
    // Does NOT match: whitespace-nowrap (not a color utility prefix)
    const RAW_NAMED_COLOR_RE =
      /\b(?:([\w-]*):)?(bg|text|border|ring|shadow|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration)-(white|black)(?:\/(\d{1,3}))?\b/g;

    /**
     * Strip modifier prefix to get the base utility for allowlist matching.
     * "hover:text-white" → "text-white"
     */
    function stripModifier(matched) {
      const colonIdx = matched.lastIndexOf(":");
      if (colonIdx === -1) return matched;
      return matched.slice(colonIdx + 1);
    }

    /**
     * Check a string value for raw Tailwind tokens.
     * @param {import("estree").Node} node
     * @param {string} value
     */
    function checkValue(node, value) {
      // Check shaded colors (bg-red-600 etc.)
      let match;
      RAW_COLOR_RE.lastIndex = 0;
      while ((match = RAW_COLOR_RE.exec(value)) !== null) {
        const base = stripModifier(match[0]);
        if (allowlist.has(base)) continue;
        context.report({
          node,
          messageId: "rawColor",
          data: { value: match[0] },
        });
      }

      // Check named colors (text-white, bg-black etc.)
      RAW_NAMED_COLOR_RE.lastIndex = 0;
      while ((match = RAW_NAMED_COLOR_RE.exec(value)) !== null) {
        const base = stripModifier(match[0]);
        if (allowlist.has(base)) continue;
        context.report({
          node,
          messageId: "rawNamedColor",
          data: { value: match[0] },
        });
      }
    }

    /**
     * Returns true if this node is inside a JSDoc / block comment context
     * (i.e. we should skip it — comments are not AST Literal nodes anyway,
     * but template-tag descriptions sometimes are).
     */
    function isInsideComment(node) {
      const parent = node.parent;
      return (
        parent &&
        parent.type === "ExpressionStatement" &&
        parent.parent &&
        parent.parent.type === "Program"
      );
    }

    return {
      // Scan ALL string literals
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (isInsideComment(node)) return;
        checkValue(node, node.value);
      },

      // Scan ALL template literals
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkValue(quasi, quasi.value.raw);
        }
      },
    };
  },
};

module.exports = rule;
