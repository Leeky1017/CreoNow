import { describe, expect, it, vi } from "vitest";

import type { ProjectStyleConfig } from "../../project/projectManager";
import { createProjectStyleFetcher } from "../fetchers/projectStyleFetcher";

const BASE_REQUEST = {
  projectId: "proj-style",
  documentId: "doc-1",
  cursorPosition: 10,
  skillId: "continue",
};

function makeStyleConfig(
  overrides?: Partial<ProjectStyleConfig>,
): ProjectStyleConfig {
  return {
    narrativePerson: "third-limited",
    genre: "悬疑推理",
    languageStyle: "简洁冷峻",
    tone: "紧张悬疑",
    targetAudience: "成年读者",
    ...overrides,
  };
}

describe("createProjectStyleFetcher", () => {
  it("should inject project style into settings layer", async () => {
    const getStyleConfig = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        data: makeStyleConfig(),
      }),
    );

    const fetcher = createProjectStyleFetcher({
      projectService: { getStyleConfig },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(getStyleConfig).toHaveBeenCalledWith("proj-style");
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("project:style");
    expect(result.chunks[0]?.content).toContain("[项目风格与类型设定]");
    expect(result.chunks[0]?.content).toContain("悬疑推理");
    expect(result.chunks[0]?.content).toContain("第三人称（有限视角）");
    expect(result.chunks[0]?.content).toContain("简洁冷峻");
    expect(result.chunks[0]?.content).toContain("紧张悬疑");
    expect(result.chunks[0]?.content).toContain("成年读者");
    expect(result.chunks[0]?.projectId).toBe("proj-style");
  });

  it("should include all narrative person labels", async () => {
    for (const [person, expectedLabel] of [
      ["first", "第一人称"],
      ["third-limited", "第三人称（有限视角）"],
      ["third-omniscient", "第三人称（全知视角）"],
    ] as const) {
      const getStyleConfig = vi.fn(() =>
        Promise.resolve({
          success: true as const,
          data: makeStyleConfig({ narrativePerson: person }),
        }),
      );

      const fetcher = createProjectStyleFetcher({
        projectService: { getStyleConfig },
      });

      const result = await fetcher(BASE_REQUEST);

      expect(result.chunks[0]?.content).toContain(expectedLabel);
    }
  });

  it("should omit empty style fields", async () => {
    const getStyleConfig = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        data: makeStyleConfig({
          genre: "",
          languageStyle: "",
          tone: "",
          targetAudience: "",
        }),
      }),
    );

    const fetcher = createProjectStyleFetcher({
      projectService: { getStyleConfig },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(1);
    const content = result.chunks[0]?.content ?? "";
    expect(content).toContain("叙事人称");
    expect(content).not.toContain("类型/流派");
    expect(content).not.toContain("语言风格");
  });

  it("should return warning when project not found", async () => {
    const getStyleConfig = vi.fn(() =>
      Promise.resolve({
        success: false as const,
        error: { code: "PROJECT_NOT_FOUND", message: "项目不存在" },
      }),
    );

    const fetcher = createProjectStyleFetcher({
      projectService: { getStyleConfig },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "PROJECT_STYLE_UNAVAILABLE: 项目风格配置未注入",
    );
  });

  it("should degrade gracefully on thrown error", async () => {
    const getStyleConfig = vi.fn(() =>
      Promise.reject(new Error("db crash")),
    );

    const fetcher = createProjectStyleFetcher({
      projectService: { getStyleConfig },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "PROJECT_STYLE_UNAVAILABLE: 项目风格配置未注入",
    );
  });
});
