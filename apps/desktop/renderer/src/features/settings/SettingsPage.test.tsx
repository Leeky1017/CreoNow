import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IpcInvokeResult } from "@shared/types/ipc-generated";

import { SettingsPage } from "./SettingsPage";

type GetConfigOk = Extract<IpcInvokeResult<"ai:config:get">, { ok: true }>;
type TestConfigOk = Extract<IpcInvokeResult<"ai:config:test">, { ok: true }>;
type UpdateConfigOk = Extract<IpcInvokeResult<"ai:config:update">, { ok: true }>;

function okGetConfig(providerMode: GetConfigOk["data"]["providerMode"]): GetConfigOk {
  return {
    ok: true,
    data: {
      enabled: true,
      providerMode,
      baseUrl: "",
      apiKeyConfigured: false,
      openAiCompatibleBaseUrl: "",
      openAiCompatibleApiKeyConfigured: false,
      openAiByokBaseUrl: "",
      openAiByokApiKeyConfigured: false,
      anthropicByokBaseUrl: "",
      anthropicByokApiKeyConfigured: false,
    },
  };
}

function okTest(latencyMs: number): TestConfigOk {
  return {
    ok: true,
    data: { ok: true, latencyMs },
  };
}

describe("SettingsPage AI 配置闭环", () => {
  it("S2: 点击测试连接后调用 IPC 并显示成功结果", async () => {
    const test = vi.fn(async (): Promise<IpcInvokeResult<"ai:config:test">> => okTest(42));

    render(
      <SettingsPage
        aiBridge={{
          get: vi.fn(async () => okGetConfig("openai-compatible")),
          test,
          update: vi.fn(async (): Promise<IpcInvokeResult<"ai:config:update">> => ({
            ok: true,
            data: okGetConfig("openai-compatible").data,
          } satisfies UpdateConfigOk)),
        }}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("ai-test-btn")).toBeEnabled());
    fireEvent.click(screen.getByTestId("ai-test-btn"));

    await waitFor(() => expect(test).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByTestId("ai-test-result")).toHaveTextContent("连接成功");
      expect(screen.getByTestId("ai-test-result")).toHaveTextContent("42ms");
    });
  });

  it("S3: 测试连接失败时展示业务错误码", async () => {
    render(
      <SettingsPage
        aiBridge={{
          get: vi.fn(async () => okGetConfig("openai-compatible")),
          test: vi.fn(async (): Promise<IpcInvokeResult<"ai:config:test">> => ({
            ok: true,
            data: {
              ok: false,
              latencyMs: 100,
              error: {
                code: "AI_AUTH_FAILED",
                message: "Proxy unauthorized",
              },
            },
          })),
          update: vi.fn(async (): Promise<IpcInvokeResult<"ai:config:update">> => ({
            ok: true,
            data: okGetConfig("openai-compatible").data,
          } satisfies UpdateConfigOk)),
        }}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("ai-test-btn")).toBeEnabled());
    fireEvent.click(screen.getByTestId("ai-test-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-test-result")).toHaveTextContent("AI_AUTH_FAILED");
    });
  });

  it("S4: 保存配置时按 provider 发送 patch", async () => {
    const update = vi.fn(async (): Promise<IpcInvokeResult<"ai:config:update">> => ({
      ok: true,
      data: {
        ...okGetConfig("openai-byok").data,
        providerMode: "openai-byok",
        openAiByokBaseUrl: "https://api.example.com/v1",
        openAiByokApiKeyConfigured: true,
      },
    }));

    render(
      <SettingsPage
        aiBridge={{
          get: vi.fn(async () => okGetConfig("openai-compatible")),
          test: vi.fn(async (): Promise<IpcInvokeResult<"ai:config:test">> => okTest(1)),
          update,
        }}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("ai-provider-mode")).toBeEnabled());

    fireEvent.change(screen.getByTestId("ai-provider-mode"), {
      target: { value: "openai-byok" },
    });
    fireEvent.change(screen.getByTestId("ai-base-url"), {
      target: { value: "https://api.example.com/v1" },
    });
    fireEvent.change(screen.getByTestId("ai-api-key"), {
      target: { value: "sk-live-123" },
    });

    fireEvent.click(screen.getByTestId("ai-save-btn"));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({
      providerMode: "openai-byok",
      openAiByokBaseUrl: "https://api.example.com/v1",
      openAiByokApiKey: "sk-live-123",
    });
  });
});
