/**
 * Tests for normalizeProxySettings (exported pure function) and
 * createAiProxySettingsService (DB-backed CRUD operations).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeProxySettings,
  createAiProxySettingsService,
  type AiProxySettingsService,
  type SecretStorageAdapter,
} from "../aiProxySettingsService";

// ── normalizeProxySettings (pure function) ──

describe("normalizeProxySettings", () => {
  it("null/undefined 输入返回安全默认值", () => {
    const result = normalizeProxySettings(null);
    expect(result.enabled).toBe(false);
    expect(result.providerMode).toBe("openai-compatible");
    expect(result.openAiCompatible.baseUrl).toBeNull();
    expect(result.openAiCompatible.apiKey).toBeNull();
    expect(result.openAiByok.baseUrl).toBeNull();
    expect(result.anthropicByok.baseUrl).toBeNull();
  });

  it("enabled 只接受 true，其他值归为 false", () => {
    expect(normalizeProxySettings({ enabled: true }).enabled).toBe(true);
    expect(normalizeProxySettings({ enabled: false }).enabled).toBe(false);
    expect(normalizeProxySettings({ enabled: 1 }).enabled).toBe(false);
    expect(normalizeProxySettings({ enabled: "yes" }).enabled).toBe(false);
  });

  it("有效 URL 被保留", () => {
    const result = normalizeProxySettings({
      openAiCompatible: {
        baseUrl: "https://api.openai.com",
        apiKey: null,
      },
    });
    expect(result.openAiCompatible.baseUrl).toBe("https://api.openai.com");
  });

  it("无效 URL 被过滤为 null", () => {
    const result = normalizeProxySettings({
      openAiCompatible: {
        baseUrl: "not-a-url",
        apiKey: null,
      },
    });
    expect(result.openAiCompatible.baseUrl).toBeNull();
  });

  it("ftp:// URL 被过滤（只允许 http/https）", () => {
    const result = normalizeProxySettings({
      openAiCompatible: {
        baseUrl: "ftp://example.com",
        apiKey: null,
      },
    });
    expect(result.openAiCompatible.baseUrl).toBeNull();
  });

  it("有效 providerMode 值被保留", () => {
    expect(
      normalizeProxySettings({ providerMode: "openai-byok" }).providerMode,
    ).toBe("openai-byok");
    expect(
      normalizeProxySettings({ providerMode: "anthropic-byok" }).providerMode,
    ).toBe("anthropic-byok");
  });

  it("无效 providerMode 默认为 openai-compatible", () => {
    expect(
      normalizeProxySettings({ providerMode: "invalid" }).providerMode,
    ).toBe("openai-compatible");
    expect(
      normalizeProxySettings({ providerMode: 123 }).providerMode,
    ).toBe("openai-compatible");
  });

  it("legacy flat baseUrl 作为 openAiCompatible fallback", () => {
    const result = normalizeProxySettings({
      baseUrl: "https://proxy.example.com",
    });
    expect(result.openAiCompatible.baseUrl).toBe("https://proxy.example.com");
  });
});

// ── createAiProxySettingsService ──

function createMockDb() {
  const store = new Map<string, string>();
  return {
    prepare: vi.fn((sql: string) => {
      if (sql.includes("SELECT")) {
        return {
          get: vi.fn((_scope: string, key: string) => {
            const val = store.get(key);
            return val !== undefined ? { valueJson: val } : undefined;
          }),
          all: vi.fn(() => []),
          run: vi.fn(),
        };
      }
      return {
        run: vi.fn((_scope: string, key: string, valueJson: string) => {
          store.set(key, valueJson);
        }),
        get: vi.fn(),
        all: vi.fn(),
      };
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
    _store: store,
  };
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logPath: "<test>",
  };
}

function createMockSecretStorage(): SecretStorageAdapter {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`enc:${text}`),
    decryptString: (buf: Buffer) => buf.toString().replace("enc:", ""),
  };
}

describe("createAiProxySettingsService", () => {
  let db: ReturnType<typeof createMockDb>;
  let logger: ReturnType<typeof createMockLogger>;
  let secretStorage: SecretStorageAdapter;
  let svc: AiProxySettingsService;

  beforeEach(() => {
    db = createMockDb();
    logger = createMockLogger();
    secretStorage = createMockSecretStorage();
    svc = createAiProxySettingsService({
      db: db as never,
      logger: logger as never,
      secretStorage,
    });
  });

  // ── get / getRaw ──

  describe("get", () => {
    it("空 DB 返回安全默认值", () => {
      const res = svc.get();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.enabled).toBe(false);
        expect(res.data.providerMode).toBe("openai-compatible");
        expect(res.data.apiKeyConfigured).toBe(false);
      }
    });

    it("DB 读取异常 → DB_ERROR", () => {
      const failDb = {
        prepare: vi.fn(() => {
          throw new Error("SQLITE_IOERR");
        }),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      };
      const failSvc = createAiProxySettingsService({
        db: failDb as never,
        logger: logger as never,
      });
      const res = failSvc.get();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("DB_ERROR");
      }
    });
  });

  describe("getRaw", () => {
    it("空 DB 返回 AiProxySettingsRaw 默认结构", () => {
      const res = svc.getRaw();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.enabled).toBe(false);
        expect(res.data.providerMode).toBe("openai-compatible");
        expect(res.data.openAiCompatible).toBeDefined();
        expect(res.data.openAiByok).toBeDefined();
        expect(res.data.anthropicByok).toBeDefined();
      }
    });

    it("settings JSON 损坏时记录解析错误日志", () => {
      const parseFailDb = {
        prepare: vi.fn((sql: string) => {
          if (sql.includes("SELECT")) {
            return {
              get: vi.fn(() => ({ valueJson: "{" })),
              all: vi.fn(() => []),
              run: vi.fn(),
            };
          }
          return {
            run: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
          };
        }),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      };
      const parseFailSvc = createAiProxySettingsService({
        db: parseFailDb as never,
        logger: logger as never,
        secretStorage,
      });
      const res = parseFailSvc.getRaw();
      expect(res.ok).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        "ai_proxy_settings_parse_failed",
        expect.objectContaining({ key: expect.any(String) }),
      );
    });
  });

  // ── update ──

  describe("update", () => {
    it("空 patch → INVALID_ARGUMENT", () => {
      const res = svc.update({ patch: {} });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_ARGUMENT");
        expect(res.error.message).toContain("patch");
      }
    });

    it("更新 enabled 成功", () => {
      const res = svc.update({ patch: { enabled: true, baseUrl: "https://proxy.example.com" } });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.enabled).toBe(true);
      }
    });

    it("更新 providerMode 成功", () => {
      const res = svc.update({ patch: { providerMode: "anthropic-byok" } });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.providerMode).toBe("anthropic-byok");
        expect(res.data.enabled).toBe(false);
      }
    });

    it("enabled=true 但无 baseUrl → INVALID_ARGUMENT", () => {
      const res = svc.update({ patch: { enabled: true } });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_ARGUMENT");
        expect(res.error.message).toContain("baseUrl");
      }
    });

    it("非 openai-compatible 模式自动禁用 proxy", () => {
      const res = svc.update({
        patch: { providerMode: "openai-byok", enabled: true },
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.enabled).toBe(false);
      }
    });

    it("无效 API key 格式 → INVALID_ARGUMENT", () => {
      const res = svc.update({
        patch: { openAiCompatibleApiKey: "bad-format" },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("DB 写入异常 → DB_ERROR", () => {
      const failDb = createMockDb();
      failDb.transaction = vi.fn(() => {
        throw new Error("SQLITE_FULL");
      });
      const failSvc = createAiProxySettingsService({
        db: failDb as never,
        logger: logger as never,
        secretStorage,
      });
      const res = failSvc.update({ patch: { enabled: false } });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("DB_ERROR");
      }
    });

    it("无 secretStorage → UNSUPPORTED (写入需要加密)", () => {
      const noSecretSvc = createAiProxySettingsService({
        db: db as never,
        logger: logger as never,
      });
      const res = noSecretSvc.update({
        patch: { openAiCompatibleApiKey: "sk-test12345678" },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(["UNSUPPORTED", "INTERNAL"]).toContain(res.error.code);
      }
    });

    it("加密失败时记录错误日志", () => {
      const brokenSecretStorage: SecretStorageAdapter = {
        isEncryptionAvailable: () => true,
        encryptString: () => {
          throw new Error("encrypt failed");
        },
        decryptString: (buf: Buffer) => buf.toString("utf8"),
      };
      const svcWithBrokenEncryption = createAiProxySettingsService({
        db: db as never,
        logger: logger as never,
        secretStorage: brokenSecretStorage,
      });
      const res = svcWithBrokenEncryption.update({
        patch: { openAiCompatibleApiKey: "sk-test12345678" },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INTERNAL");
      }
      expect(logger.error).toHaveBeenCalledWith(
        "ai_proxy_settings_secret_encrypt_failed",
        expect.objectContaining({ message: "encrypt failed" }),
      );
    });

    it("更新后日志记录成功", () => {
      svc.update({ patch: { providerMode: "openai-compatible" } });
      expect(logger.info).toHaveBeenCalledWith(
        "ai_proxy_settings_updated",
        expect.objectContaining({ providerMode: "openai-compatible" }),
      );
    });
  });
});
