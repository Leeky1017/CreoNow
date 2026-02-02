export type RagQueryPlan = {
  queries: string[];
};

const DEFAULT_MAX_QUERIES = 4;
const MAX_TOKENS = 8;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, MAX_TOKENS);
}

/**
 * Plan a small set of FTS5 queries from a raw user query text.
 *
 * Why: V1 needs an "agent-like" query planning step that is deterministic and
 * observable (queries + per-query hits), without depending on an upstream LLM.
 */
export function planFtsQueries(args: {
  queryText: string;
  maxQueries?: number;
}): RagQueryPlan {
  const trimmed = args.queryText.trim();
  if (trimmed.length === 0) {
    return { queries: [] };
  }

  const requested =
    typeof args.maxQueries === "number" && Number.isFinite(args.maxQueries)
      ? args.maxQueries
      : DEFAULT_MAX_QUERIES;
  const maxQueries = Math.max(
    1,
    Math.min(DEFAULT_MAX_QUERIES, Math.floor(requested)),
  );

  const tokens = tokenize(trimmed);
  const queries: string[] = [];
  const push = (q: string) => {
    if (queries.length >= maxQueries) {
      return;
    }
    if (!queries.includes(q)) {
      queries.push(q);
    }
  };

  // 1) Raw user query (can include user-provided operators).
  push(trimmed);

  if (tokens.length >= 2) {
    // 2) Phrase query (token-only to avoid syntax pitfalls).
    push(`"${tokens.join(" ")}"`);
    // 3) Head-token query to broaden recall without forcing OR semantics.
    push(tokens[0] ?? trimmed);
    // 4) OR query to broaden recall when exact query yields too few hits.
    push(tokens.join(" OR "));
  }

  return { queries };
}
