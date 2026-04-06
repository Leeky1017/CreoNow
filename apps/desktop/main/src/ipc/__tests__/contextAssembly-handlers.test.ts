import { describe, it, expect, vi } from "vitest";

import type { IpcMain } from "electron";
import type { IpcResponse } from "@shared/types/ipc-generated";

import { registerContextAssemblyHandlers } from "../contextAssembly";
import {
  CONTEXT_CAPACITY_LIMITS,
  type ContextLayerAssemblyService,
} from "../../services/context/layerAssemblyService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createMockLogger() {
  return {
    logPath: "",
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createMockAssemblyService(): ContextLayerAssemblyService {
  return {
    assemble: vi.fn().mockResolvedValue({
      layers: [],
      sources: [],
      warnings: [],
    }),
    inspect: vi.fn().mockResolvedValue({
      layers: [],
      sources: [],
      warnings: [],
    }),
  } as unknown as ContextLayerAssemblyService;
}

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({ rootPath: "/project/root" }),
    }),
  };
}

type Harness = {
  handlers: Map<string, Handler>;
  logger: ReturnType<typeof createMockLogger>;
  assemblyService: ReturnType<typeof createMockAssemblyService>;
  inFlightByDocument: Map<string, number>;
  invoke: <T>(channel: string, payload: unknown) => Promise<IpcResponse<T>>;
};

function createHarness(args?: {
  db?: unknown;
  useNullDb?: boolean;
}): Harness {
  const handlers = new Map<string, Handler>();
  const logger = createMockLogger();
  const assemblyService = createMockAssemblyService();
  const inFlightByDocument = new Map<string, number>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const dbValue = args?.useNullDb ? null : (args?.db ?? createMockDb());

  registerContextAssemblyHandlers({
    ipcMain,
    db: dbValue as never,
    logger,
    contextAssemblyService: assemblyService,
    inFlightByDocument,
  });

  return {
    handlers,
    logger,
    assemblyService,
    inFlightByDocument,
    invoke: async <T>(channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({}, payload) as Promise<IpcResponse<T>>;
    },
  };
}

function validAssemblePayload() {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    skillId: "skill-1",
    cursorPosition: 42,
  };
}

function validInspectPayload() {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    skillId: "skill-1",
    cursorPosition: 42,
    callerRole: "owner",
    debugMode: true,
  };
}

describe("registerContextAssemblyHandlers", () => {
  describe("handler registration", () => {
    it("should register assemble and inspect handlers", () => {
      const { handlers } = createHarness();
      expect(handlers.has("context:prompt:assemble")).toBe(true);
      expect(handlers.has("context:prompt:inspect")).toBe(true);
    });
  });

  describe("context:prompt:assemble", () => {
    it("should return DB_ERROR when database is null", async () => {
      const { invoke } = createHarness({ useNullDb: true });
      const result = await invoke("context:prompt:assemble", validAssemblePayload());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
    });

    it("should reject empty projectId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        projectId: "  ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("projectId");
      }
    });

    it("should reject empty documentId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        documentId: "",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("documentId");
      }
    });

    it("should reject empty skillId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        skillId: "",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("skillId");
      }
    });

    it("should reject NaN cursorPosition", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        cursorPosition: NaN,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("cursorPosition");
      }
    });

    it("should reject non-number cursorPosition", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        cursorPosition: "abc",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should return NOT_FOUND when project does not exist", async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        }),
      };
      const { invoke } = createHarness({ db });
      const result = await invoke("context:prompt:assemble", validAssemblePayload());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should successfully assemble context", async () => {
      const { invoke, assemblyService } = createHarness();
      const assembled = { layers: [{ id: "rules" }], sources: [], warnings: [] };
      (assemblyService.assemble as ReturnType<typeof vi.fn>).mockResolvedValue(assembled);

      const result = await invoke("context:prompt:assemble", validAssemblePayload());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(assembled);
      }
    });

    it("should release document slot after successful assemble", async () => {
      const { invoke, inFlightByDocument } = createHarness();
      await invoke("context:prompt:assemble", validAssemblePayload());
      expect(inFlightByDocument.size).toBe(0);
    });

    it("should release document slot after error", async () => {
      const { invoke, assemblyService, inFlightByDocument } = createHarness();
      (assemblyService.assemble as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("unexpected"),
      );

      const result = await invoke("context:prompt:assemble", validAssemblePayload());
      expect(result.ok).toBe(false);
      expect(inFlightByDocument.size).toBe(0);
    });

    it("should return CONTEXT_BACKPRESSURE when too many concurrent requests", async () => {
      const { invoke, inFlightByDocument } = createHarness();
      const key = "proj-1:doc-1";
      inFlightByDocument.set(key, CONTEXT_CAPACITY_LIMITS.maxConcurrentByDocument);

      const result = await invoke("context:prompt:assemble", validAssemblePayload());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_BACKPRESSURE");
      }
    });

    it("should return CONTEXT_INPUT_TOO_LARGE when input is too large", async () => {
      const { invoke } = createHarness();
      const largeInput = "a".repeat(CONTEXT_CAPACITY_LIMITS.maxInputTokens * 5);
      const result = await invoke("context:prompt:assemble", {
        ...validAssemblePayload(),
        additionalInput: largeInput,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_INPUT_TOO_LARGE");
      }
    });
  });

  describe("context:prompt:inspect", () => {
    it("should return DB_ERROR when database is null", async () => {
      const { invoke } = createHarness({ useNullDb: true });
      const result = await invoke("context:prompt:inspect", validInspectPayload());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
    });

    it("should reject empty projectId", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:inspect", {
        ...validInspectPayload(),
        projectId: "",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("should return CONTEXT_INSPECT_FORBIDDEN when debugMode is false", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:inspect", {
        ...validInspectPayload(),
        debugMode: false,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_INSPECT_FORBIDDEN");
      }
    });

    it("should return CONTEXT_INSPECT_FORBIDDEN for non-owner callerRole", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:inspect", {
        ...validInspectPayload(),
        callerRole: "viewer",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_INSPECT_FORBIDDEN");
      }
    });

    it("should allow maintainer callerRole", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:inspect", {
        ...validInspectPayload(),
        callerRole: "maintainer",
      });
      expect(result.ok).toBe(true);
    });

    it("should return CONTEXT_INSPECT_FORBIDDEN for undefined callerRole", async () => {
      const { invoke } = createHarness();
      const result = await invoke("context:prompt:inspect", {
        ...validInspectPayload(),
        callerRole: undefined,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONTEXT_INSPECT_FORBIDDEN");
      }
    });

    it("should successfully inspect context", async () => {
      const { invoke, assemblyService } = createHarness();
      const inspected = { layers: [], sources: [], warnings: [] };
      (assemblyService.inspect as ReturnType<typeof vi.fn>).mockResolvedValue(inspected);

      const result = await invoke("context:prompt:inspect", validInspectPayload());
      expect(result.ok).toBe(true);
    });

    it("should release document slot on inspect error", async () => {
      const { invoke, assemblyService, inFlightByDocument } = createHarness();
      (assemblyService.inspect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("boom"),
      );

      const result = await invoke("context:prompt:inspect", validInspectPayload());
      expect(result.ok).toBe(false);
      expect(inFlightByDocument.size).toBe(0);
    });
  });
});
