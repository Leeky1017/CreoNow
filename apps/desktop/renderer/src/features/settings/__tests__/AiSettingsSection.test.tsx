import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiSettingsSection } from "../AiSettingsSection";

const mockInvoke = vi.fn();

vi.mock("../../../lib/ipcClient", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("../../ai/modelCatalogEvents", () => ({
  emitAiModelCatalogUpdated: vi.fn(),
}));

const defaultSettings = {
  enabled: false,
  baseUrl: "",
  apiKeyConfigured: false,
  providerMode: "openai-compatible" as const,
  openAiCompatibleBaseUrl: "",
  openAiCompatibleApiKeyConfigured: false,
  openAiByokBaseUrl: "",
  openAiByokApiKeyConfigured: false,
  anthropicByokBaseUrl: "",
  anthropicByokApiKeyConfigured: false,
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "ai:config:get") {
      return Promise.resolve({ ok: true, data: defaultSettings });
    }
    if (channel === "ai:models:list") {
      return Promise.resolve({
        ok: true,
        data: { source: "proxy", items: [] },
      });
    }
    return Promise.resolve({ ok: true, data: {} });
  });
});

describe("AiSettingsSection", () => {
  it("renders provider mode selector", async () => {
    render(<AiSettingsSection />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-provider-mode")).toBeInTheDocument();
    });
  });

  it("renders API Key input field", async () => {
    render(<AiSettingsSection />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-api-key")).toBeInTheDocument();
    });
  });

  it("shows configured state when apiKeyConfigured is true", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "ai:config:get") {
        return Promise.resolve({
          ok: true,
          data: {
            ...defaultSettings,
            openAiCompatibleApiKeyConfigured: true,
          },
        });
      }
      if (channel === "ai:models:list") {
        return Promise.resolve({
          ok: true,
          data: { source: "proxy", items: [] },
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    render(<AiSettingsSection />);

    await waitFor(() => {
      const apiKeyInput = screen.getByTestId("ai-api-key");
      expect(apiKeyInput).toHaveAttribute("placeholder", expect.stringContaining("已配置"));
    });
  });

  it("calls ai:config:test on test button click", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "ai:config:get") {
        return Promise.resolve({ ok: true, data: defaultSettings });
      }
      if (channel === "ai:models:list") {
        return Promise.resolve({
          ok: true,
          data: { source: "proxy", items: [] },
        });
      }
      if (channel === "ai:config:test") {
        return Promise.resolve({
          ok: true,
          data: { ok: true, latencyMs: 42 },
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    render(<AiSettingsSection />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-btn")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("ai-test-btn"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("ai:config:test", expect.anything());
    });
  });

  it("shows success result with latency", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "ai:config:get") {
        return Promise.resolve({ ok: true, data: defaultSettings });
      }
      if (channel === "ai:models:list") {
        return Promise.resolve({
          ok: true,
          data: { source: "proxy", items: [] },
        });
      }
      if (channel === "ai:config:test") {
        return Promise.resolve({
          ok: true,
          data: { ok: true, latencyMs: 42 },
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    render(<AiSettingsSection />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-btn")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("ai-test-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-result")).toHaveTextContent("42ms");
    });
  });

  it("shows error result on test failure", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "ai:config:get") {
        return Promise.resolve({ ok: true, data: defaultSettings });
      }
      if (channel === "ai:models:list") {
        return Promise.resolve({
          ok: true,
          data: { source: "proxy", items: [] },
        });
      }
      if (channel === "ai:config:test") {
        return Promise.resolve({
          ok: true,
          data: {
            ok: false,
            latencyMs: 100,
            error: { code: "AI_AUTH_FAILED", message: "Unauthorized" },
          },
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    render(<AiSettingsSection />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-btn")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("ai-test-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-result")).toHaveTextContent(
        /Unauthorized/,
      );
    });
  });
});
