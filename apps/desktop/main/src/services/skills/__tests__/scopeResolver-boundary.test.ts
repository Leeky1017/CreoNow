import { describe, it, expect } from "vitest";

import { selectSkillsByScope } from "../scopeResolver";

type TestSkill = {
  id: string;
  name: string;
  scope: "builtin" | "global" | "project";
  filePath: string;
};

function skill(
  id: string,
  name: string,
  scope: "builtin" | "global" | "project",
  filePath = `/skills/${scope}/${id}/SKILL.md`,
): TestSkill {
  return { id, name, scope, filePath };
}

describe("selectSkillsByScope", () => {
  describe("scope precedence: project > global > builtin", () => {
    it("should prefer project over builtin when names match", () => {
      const items = [
        skill("builtin:rewrite", "改写", "builtin"),
        skill("project:rewrite", "改写", "project"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("project");
      expect(result[0].id).toBe("project:rewrite");
    });

    it("should prefer global over builtin when names match", () => {
      const items = [
        skill("builtin:rewrite", "改写", "builtin"),
        skill("global:rewrite", "改写", "global"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("global");
    });

    it("should prefer project over global when names match", () => {
      const items = [
        skill("global:rewrite", "改写", "global"),
        skill("project:rewrite", "改写", "project"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("project");
    });

    it("should prefer project when all three scopes have same name", () => {
      const items = [
        skill("builtin:rewrite", "改写", "builtin"),
        skill("global:rewrite", "改写", "global"),
        skill("project:rewrite", "改写", "project"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("project");
    });
  });

  describe("name-based key (case insensitive)", () => {
    it("should treat names as case-insensitive for dedup", () => {
      const items = [
        skill("builtin:rewrite", "Rewrite", "builtin"),
        skill("global:rewrite", "rewrite", "global"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("global");
    });

    it("should trim whitespace from names", () => {
      const items = [
        skill("builtin:rewrite", "  改写  ", "builtin"),
        skill("project:rewrite", "改写", "project"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("project");
    });
  });

  describe("id-based fallback when name is empty", () => {
    it("should fall back to id leaf when name is empty", () => {
      const items = [
        skill("builtin:rewrite", "", "builtin"),
        skill("global:rewrite", "", "global"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("global");
    });

    it("should fall back to id leaf when name is whitespace-only", () => {
      const items = [
        skill("builtin:rewrite", "   ", "builtin"),
        skill("global:rewrite", "   ", "global"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("global");
    });
  });

  describe("deterministic filePath tiebreaking within same scope", () => {
    it("should pick earlier filePath when two skills in same scope have same name", () => {
      const items = [
        skill("a:rewrite", "改写", "global", "/skills/b/SKILL.md"),
        skill("b:rewrite", "改写", "global", "/skills/a/SKILL.md"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("/skills/a/SKILL.md");
    });
  });

  describe("no conflicts — all skills preserved", () => {
    it("should keep all skills with different names", () => {
      const items = [
        skill("builtin:rewrite", "改写", "builtin"),
        skill("builtin:expand", "展开", "builtin"),
        skill("global:polish", "润色", "global"),
      ];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(3);
    });

    it("should return empty array for empty input", () => {
      expect(selectSkillsByScope([])).toEqual([]);
    });

    it("should return single skill unchanged", () => {
      const items = [skill("builtin:rewrite", "改写", "builtin")];
      const result = selectSkillsByScope(items);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("builtin:rewrite");
    });
  });

  describe("output ordering", () => {
    it("should sort output by id ascending", () => {
      const items = [
        skill("c:polish", "润色", "project"),
        skill("a:rewrite", "改写", "builtin"),
        skill("b:expand", "展开", "global"),
      ];
      const result = selectSkillsByScope(items);
      const ids = result.map((s) => s.id);
      expect(ids).toEqual(["a:rewrite", "b:expand", "c:polish"]);
    });
  });
});
