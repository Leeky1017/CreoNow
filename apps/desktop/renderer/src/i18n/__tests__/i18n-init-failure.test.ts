import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("i18n init failure recovery", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unmock("i18next");
    vi.unmock("react-i18next");
  });

  it("retries initializeI18n after init rejection", async () => {
    const initMock = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("init failed"))
      .mockResolvedValue(undefined);

    const instance = {
      use: vi.fn(function use() {
        return instance;
      }),
      init: initMock,
    };

    vi.doMock("i18next", () => ({
      __esModule: true,
      default: {
        createInstance: () => instance,
      },
    }));

    vi.doMock("react-i18next", () => ({
      initReactI18next: {},
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // noop for test output hygiene
    });

    const mod = await import("../index");
    await Promise.resolve();

    await expect(mod.initializeI18n()).resolves.toBe(mod.i18n);
    expect(initMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith("I18N_INIT_FAILED", expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith(
      "I18N_BOOTSTRAP_FAILED",
      expect.any(Error),
    );
  });
});
