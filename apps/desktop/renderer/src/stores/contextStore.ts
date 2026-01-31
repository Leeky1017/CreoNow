import React from "react";
import { create } from "zustand";
import { parseDocument } from "yaml";

import type {
  IpcChannel,
  IpcError,
  IpcInvokeResult,
  IpcRequest,
} from "../../../../../packages/shared/types/ipc-generated";
import {
  assembleContext,
  formatKnowledgeGraphContext,
  type AssembledContext,
  type TrimEvidenceItem,
} from "../lib/ai/contextAssembler";
import {
  redactText,
  type RedactionEvidenceItem,
} from "../lib/redaction/redact";

export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
) => Promise<IpcInvokeResult<C>>;

export type ContextStatus = "idle" | "loading" | "ready" | "error";

export type ContextState = {
  viewerOpen: boolean;
  status: ContextStatus;
  assembled: AssembledContext | null;
  lastError: IpcError | null;
};

export type ContextActions = {
  toggleViewer: (args: {
    projectId: string | null;
    skillId: string | null;
    immediateInput: string;
  }) => Promise<void>;
  refresh: (args: {
    projectId: string | null;
    skillId: string | null;
    immediateInput: string;
  }) => Promise<AssembledContext>;
  clearError: () => void;
};

export type ContextStore = ContextState & ContextActions;

export type UseContextStore = ReturnType<typeof createContextStore>;

const ContextStoreContext = React.createContext<UseContextStore | null>(null);

const DEFAULT_MAX_INPUT_TOKENS = 4000;

/**
 * Create a zustand store for context engineering state.
 *
 * Why: the renderer needs deterministic context assembly + evidence for UI/E2E,
 * while `.creonow` IO remains in the main process behind typed IPC.
 */
export function createContextStore(deps: { invoke: IpcInvoke }) {
  type JsonObject = Record<string, unknown>;

  /**
   * Narrow an unknown value to a JSON object.
   *
   * Why: skill YAML parsing must be defensive and must not throw from untrusted content.
   */
  function asObject(x: unknown): JsonObject | null {
    if (typeof x !== "object" || x === null || Array.isArray(x)) {
      return null;
    }
    return x as JsonObject;
  }

  /**
   * Split YAML frontmatter from a SKILL.md content string.
   *
   * Why: context rules are defined in YAML, but the renderer only needs a small,
   * deterministic subset to decide what to inject.
   */
  function splitFrontmatter(content: string): string | null {
    const normalized = content.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    if (lines.length === 0 || lines[0]?.trim() !== "---") {
      return null;
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i]?.trim() === "---") {
        endIndex = i;
        break;
      }
    }
    if (endIndex === -1) {
      return null;
    }

    return lines.slice(1, endIndex).join("\n");
  }

  /**
   * Read `context_rules.knowledge_graph` from a skill's YAML frontmatter.
   *
   * Why: KG injection must be explicitly enabled by the skill contract to keep
   * prompt inputs auditable and predictable.
   */
  async function isKnowledgeGraphEnabled(
    skillId: string | null,
  ): Promise<boolean> {
    if (!skillId) {
      return false;
    }

    const res = await deps.invoke("skill:read", { id: skillId });
    if (!res.ok) {
      return false;
    }

    const frontmatterText = splitFrontmatter(res.data.content);
    if (!frontmatterText) {
      return false;
    }

    const doc = parseDocument(frontmatterText);
    if (doc.errors.length > 0) {
      return false;
    }

    const parsed: unknown = doc.toJSON();
    const obj = asObject(parsed);
    const contextRules = asObject(obj?.context_rules);
    return contextRules?.knowledge_graph === true;
  }

  /**
   * Load and format the KG context block (retrieved layer) when enabled.
   *
   * Why: KG is stored in SQLite (main) but must be injected into a deterministic
   * retrieved layer for context viewer and prompt assembly.
   */
  async function loadKnowledgeGraphContext(args: {
    projectId: string;
    enabled: boolean;
  }): Promise<{
    sources: Array<{ sourceRef: string; text: string }>;
    redactionEvidence: RedactionEvidenceItem[];
    readErrors: TrimEvidenceItem[];
  }> {
    if (!args.enabled) {
      return { sources: [], redactionEvidence: [], readErrors: [] };
    }

    const res = await deps.invoke("kg:graph:get", {
      projectId: args.projectId,
      purpose: "context",
    });

    if (!res.ok) {
      return {
        sources: [],
        redactionEvidence: [],
        readErrors: [
          {
            layer: "retrieved",
            sourceRef: "kg:graph:get",
            action: "dropped",
            reason: "read_error",
            beforeChars: 0,
            afterChars: 0,
          },
        ],
      };
    }

    const formatted = formatKnowledgeGraphContext({
      entities: res.data.entities,
      relations: res.data.relations,
      maxEntities: 50,
      maxRelations: 50,
    });

    const redacted = redactText({
      text: formatted,
      sourceRef: "retrieved:knowledge_graph",
    });

    return {
      sources: [
        {
          sourceRef: "retrieved:knowledge_graph",
          text: redacted.redactedText,
        },
      ],
      redactionEvidence: redacted.evidence,
      readErrors: [],
    };
  }

  /**
   * Load `.creonow/<scope>` file contents via IPC.
   *
   * Why: renderer cannot touch Node FS APIs; main must enforce path safety and
   * redact sensitive content before it reaches the UI or prompt injection.
   */
  async function loadCreonowScope(args: {
    projectId: string;
    scope: "rules" | "settings";
  }): Promise<{
    sources: Array<{ sourceRef: string; text: string }>;
    redactionEvidence: RedactionEvidenceItem[];
    readErrors: TrimEvidenceItem[];
  }> {
    const listChannel =
      args.scope === "rules"
        ? ("context:creonow:rules:list" as const)
        : ("context:creonow:settings:list" as const);

    const readChannel =
      args.scope === "rules"
        ? ("context:creonow:rules:read" as const)
        : ("context:creonow:settings:read" as const);

    const listRes = await deps.invoke(listChannel, {
      projectId: args.projectId,
    });
    if (!listRes.ok) {
      return {
        sources: [],
        redactionEvidence: [],
        readErrors: [
          {
            layer: args.scope,
            sourceRef: `.creonow/${args.scope}`,
            action: "dropped",
            reason: "read_error",
            beforeChars: 0,
            afterChars: 0,
          },
        ],
      };
    }

    const sources: Array<{ sourceRef: string; text: string }> = [];
    const redactionEvidence: RedactionEvidenceItem[] = [];
    const readErrors: TrimEvidenceItem[] = [];

    for (const item of listRes.data.items) {
      const readRes = await deps.invoke(readChannel, {
        projectId: args.projectId,
        path: item.path,
      });

      if (!readRes.ok) {
        readErrors.push({
          layer: args.scope,
          sourceRef: item.path,
          action: "dropped",
          reason: "read_error",
          beforeChars: 0,
          afterChars: 0,
        });
        continue;
      }

      sources.push({
        sourceRef: readRes.data.path,
        text: readRes.data.content,
      });
      redactionEvidence.push(...readRes.data.redactionEvidence);
    }

    return { sources, redactionEvidence, readErrors };
  }

  /**
   * Format memory injection preview results into a retrieved-layer block.
   *
   * Why: query-dependent memory recall MUST live in a dynamic layer to preserve
   * stablePrefixHash semantics and to keep context viewer auditable.
   */
  function formatMemoryInjectionContext(args: {
    items: Array<{
      scope: string;
      type: string;
      origin: string;
      content: string;
      reason:
        | { kind: "deterministic" }
        | { kind: "semantic"; score: number };
    }>;
    mode: "deterministic" | "semantic";
  }): string {
    const lines: string[] = [];
    lines.push(`mode=${args.mode}`);

    for (const item of args.items) {
      const tag = `${item.scope}/${item.type}/${item.origin}`;
      const reason =
        item.reason.kind === "semantic"
          ? `semantic:${item.reason.score.toFixed(3)}`
          : "deterministic";
      lines.push(`- (${tag}; ${reason}) ${item.content}`);
    }

    return `${lines.join("\n").trimEnd()}\n`;
  }

  return create<ContextStore>((set, get) => ({
    viewerOpen: false,
    status: "idle",
    assembled: null,
    lastError: null,

    clearError: () => set({ lastError: null }),

    toggleViewer: async ({ projectId, skillId, immediateInput }) => {
      const next = !get().viewerOpen;
      set({ viewerOpen: next });
      if (next) {
        await get().refresh({ projectId, skillId, immediateInput });
      }
    },

    refresh: async ({ projectId, skillId, immediateInput }) => {
      const state = get();
      if (state.status === "loading") {
        return (
          state.assembled ??
          assembleContext({
            rules: [],
            settings: [],
            retrieved: [],
            immediate: [],
            maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
            redactionEvidence: [],
          })
        );
      }

      set({ status: "loading", lastError: null });

      const immediateRedacted = redactText({
        text: immediateInput,
        sourceRef: "immediate:ai_panel_input",
      });

      if (!projectId) {
        const assembled = assembleContext({
          rules: [],
          settings: [],
          retrieved: [],
          immediate: [
            {
              sourceRef: "immediate:ai_panel_input",
              text: immediateRedacted.redactedText,
            },
          ],
          maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
          redactionEvidence: immediateRedacted.evidence,
        });

        set({ status: "ready", assembled, lastError: null });
        return assembled;
      }

      const knowledgeGraphEnabled = await isKnowledgeGraphEnabled(skillId);

      const rules = await loadCreonowScope({ projectId, scope: "rules" });
      const settings = await loadCreonowScope({ projectId, scope: "settings" });
      const knowledgeGraph = await loadKnowledgeGraphContext({
        projectId,
        enabled: knowledgeGraphEnabled,
      });

      const retrievedSources: Array<{ sourceRef: string; text: string }> = [];
      const retrievedRedactionEvidence: RedactionEvidenceItem[] = [];
      const retrievedReadErrors: TrimEvidenceItem[] = [];

      if (immediateInput.trim().length > 0) {
        const ragRes = await deps.invoke("rag:retrieve", {
          projectId,
          queryText: immediateInput,
        });

        if (ragRes.ok) {
          for (const item of ragRes.data.items) {
            const redacted = redactText({
              text: item.snippet,
              sourceRef: item.sourceRef,
            });
            retrievedSources.push({
              sourceRef: item.sourceRef,
              text: redacted.redactedText,
            });
            retrievedRedactionEvidence.push(...redacted.evidence);
          }
        } else {
            retrievedReadErrors.push({
              layer: "retrieved",
              sourceRef: "rag:retrieve",
              action: "dropped",
              reason: "read_error",
              beforeChars: 0,
              afterChars: 0,
            });
        }

        const memoryRes = await deps.invoke("memory:injection:preview", {
          projectId,
          queryText: immediateInput,
        });
        if (memoryRes.ok) {
          if (memoryRes.data.items.length > 0) {
            const formatted = formatMemoryInjectionContext({
              items: memoryRes.data.items,
              mode: memoryRes.data.mode,
            });
            const redacted = redactText({
              text: formatted,
              sourceRef: "retrieved:user_memory",
            });
            retrievedSources.push({
              sourceRef: "retrieved:user_memory",
              text: redacted.redactedText,
            });
            retrievedRedactionEvidence.push(...redacted.evidence);
          }
        } else {
          retrievedReadErrors.push({
            layer: "retrieved",
            sourceRef: "memory:injection:preview",
            action: "dropped",
            reason: "read_error",
            beforeChars: 0,
            afterChars: 0,
          });
        }
      }

      const assembled = assembleContext({
        rules: rules.sources,
        settings: settings.sources,
        retrieved: [...knowledgeGraph.sources, ...retrievedSources],
        immediate: [
          {
            sourceRef: "immediate:ai_panel_input",
            text: immediateRedacted.redactedText,
          },
        ],
        maxInputTokens: DEFAULT_MAX_INPUT_TOKENS,
        redactionEvidence: [
          ...rules.redactionEvidence,
          ...settings.redactionEvidence,
          ...knowledgeGraph.redactionEvidence,
          ...retrievedRedactionEvidence,
          ...immediateRedacted.evidence,
        ],
      });

      const mergedEvidence: TrimEvidenceItem[] = [
        ...rules.readErrors,
        ...settings.readErrors,
        ...knowledgeGraph.readErrors,
        ...retrievedReadErrors,
        ...assembled.trimEvidence,
      ];

      const merged = { ...assembled, trimEvidence: mergedEvidence };

      set({ status: "ready", assembled: merged, lastError: null });
      return merged;
    },
  }));
}

/**
 * Provide a context store instance for the Workbench UI.
 */
export function ContextStoreProvider(props: {
  store: UseContextStore;
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(
    ContextStoreContext.Provider,
    { value: props.store },
    props.children,
  );
}

/**
 * Read values from the injected context store.
 */
export function useContextStore<T>(selector: (state: ContextStore) => T): T {
  const store = React.useContext(ContextStoreContext);
  if (!store) {
    throw new Error("ContextStoreProvider is missing");
  }
  return store(selector);
}
