import { describe, expect, it, vi } from "vitest";

import type { CharacterListService } from "../../skills/characterListService";
import { createCharacterContextFetcher } from "../fetchers/characterContextFetcher";

const BASE_REQUEST = {
  projectId: "proj-char",
  documentId: "doc-1",
  cursorPosition: 10,
  skillId: "continue",
};

describe("createCharacterContextFetcher", () => {
  it("should inject character/location data into settings layer", async () => {
    const injectCharactersIntoContext = vi.fn<
      CharacterListService["injectCharactersIntoContext"]
    >(() => ({
      ok: true,
      data: {
        text: "[角色设定清单]\n- 张三：主角，性格沉稳\n\n[场景/地点清单]\n- 临安古城：故事主要发生地",
        characterCount: 1,
        locationCount: 1,
        truncated: false,
      },
    }));

    const fetcher = createCharacterContextFetcher({
      characterListService: { injectCharactersIntoContext },
      tokenBudget: 500,
    });

    const result = await fetcher(BASE_REQUEST);

    expect(injectCharactersIntoContext).toHaveBeenCalledWith("proj-char", 500);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("characters:list");
    expect(result.chunks[0]?.content).toContain("张三");
    expect(result.chunks[0]?.content).toContain("临安古城");
    expect(result.chunks[0]?.projectId).toBe("proj-char");
  });

  it("should return empty when no characters or locations", async () => {
    const injectCharactersIntoContext = vi.fn<
      CharacterListService["injectCharactersIntoContext"]
    >(() => ({
      ok: true,
      data: {
        text: "",
        characterCount: 0,
        locationCount: 0,
        truncated: false,
      },
    }));

    const fetcher = createCharacterContextFetcher({
      characterListService: { injectCharactersIntoContext },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
  });

  it("should mark truncated when injection was truncated", async () => {
    const injectCharactersIntoContext = vi.fn<
      CharacterListService["injectCharactersIntoContext"]
    >(() => ({
      ok: true,
      data: {
        text: "[角色设定清单]\n- 张三：主角",
        characterCount: 3,
        locationCount: 2,
        truncated: true,
      },
    }));

    const fetcher = createCharacterContextFetcher({
      characterListService: { injectCharactersIntoContext },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it("should return warning when injection fails", async () => {
    const injectCharactersIntoContext = vi.fn<
      CharacterListService["injectCharactersIntoContext"]
    >(() => ({
      ok: false,
      error: { code: "KG_RECOGNITION_UNAVAILABLE" as const, message: "kg unavailable" },
    }));

    const fetcher = createCharacterContextFetcher({
      characterListService: { injectCharactersIntoContext },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "CHARACTER_CONTEXT_UNAVAILABLE: 角色/地点数据未注入",
    );
  });

  it("should degrade gracefully on thrown error", async () => {
    const injectCharactersIntoContext = vi.fn(() => {
      throw new Error("unexpected");
    });

    const fetcher = createCharacterContextFetcher({
      characterListService: {
        injectCharactersIntoContext:
          injectCharactersIntoContext as unknown as CharacterListService["injectCharactersIntoContext"],
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "CHARACTER_CONTEXT_UNAVAILABLE: 角色/地点数据未注入",
    );
  });
});
