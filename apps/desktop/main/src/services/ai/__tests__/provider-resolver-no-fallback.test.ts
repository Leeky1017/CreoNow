import { describe, expect, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import type { ProxySettings } from "../providerResolver";
import { createProviderResolver } from "../providerResolver";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

describe("provider resolver P1 phase cut", () => {
  it("rejects legacy flat settings fields", async () => {
    const resolver = createProviderResolver({
      logger: createLogger(),
      now: () => 1_000,
    });

    const legacyOnly = {
      enabled: false,
      providerMode: "openai-byok",
      openAiByokBaseUrl: "https://legacy-openai.example",
      openAiByokApiKey: "sk-legacy-only",
    } as unknown as ProxySettings;

    const resolved = await resolver.resolveProviderConfig({
      env: {},
      runtimeAiTimeoutMs: 30_000,
      getFakeServer: async () => {
        throw new Error("should not be called");
      },
      getProxySettings: () => legacyOnly,
    });

    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      throw new Error("AUD-C7-S3: legacy-only settings must not resolve");
    }

    expect(resolved.error.code).toBe("AI_NOT_CONFIGURED");
    expect(resolved.error.message).toMatch(/configure/i);
  });

  it("resolves only the canonical primary provider on the P1 path", async () => {
    const resolver = createProviderResolver({
      logger: createLogger(),
      now: () => 1_000,
    });

    const canonical: ProxySettings = {
      enabled: true,
      providerMode: "openai-byok",
      openAiCompatible: {
        baseUrl: "https://proxy.example",
        apiKey: "sk-proxy",
      },
      openAiByok: {
        baseUrl: "https://api.openai.com",
        apiKey: "sk-openai",
      },
      anthropicByok: {
        baseUrl: null,
        apiKey: null,
      },
    };

    const resolved = await resolver.resolveProviderConfig({
      env: {},
      runtimeAiTimeoutMs: 30_000,
      getFakeServer: async () => {
        throw new Error("should not be called");
      },
      getProxySettings: () => canonical,
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      throw new Error("AUD-C7-S3: canonical settings should resolve");
    }

    expect(resolved.data.primary.provider).toBe("openai");
    expect(resolved.data.primary.baseUrl).toBe("https://api.openai.com");
    expect(resolved.data.primary.apiKey).toBe("sk-openai");
    expect(resolved.data.backup).toBeNull();
  });

  it("fails fast when env resolution lacks an API key", async () => {
    const resolver = createProviderResolver({
      logger: createLogger(),
      now: () => 1_000,
    });

    const resolved = await resolver.resolveProviderConfig({
      env: {
        CREONOW_E2E: "1",
        CREONOW_AI_PROVIDER: "anthropic",
        CREONOW_AI_BASE_URL: "http://127.0.0.1:9",
      },
      runtimeAiTimeoutMs: 30_000,
      getFakeServer: async () => {
        throw new Error("should not be called");
      },
    });

    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      throw new Error("missing api key should fail when baseUrl is explicit");
    }

    expect(resolved.error.code).toBe("AI_NOT_CONFIGURED");
    expect(resolved.error.message).toMatch(/api key/i);
  });
});
