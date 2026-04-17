/**
 * Unit tests for KG impactAnalyzer.
 *
 * Covers:
 * - severity classification ladder (low / mid / high / critical)
 * - relation direction split (incoming / outgoing)
 * - unresolved foreshadow detection (json_extract `resolved` flag)
 * - input validation (empty projectId / entityId)
 * - NOT_FOUND when entity does not exist in project
 * - DB_ERROR propagation
 */

import { describe, it, expect, vi, type Mock } from "vitest";

import {
  classifyImpactSeverity,
  createKgImpactAnalyzer,
  CRITICAL_RELATION_COUNT,
  CRITICAL_UNRESOLVED_FORESHADOW_COUNT,
  HIGH_RELATION_COUNT,
  MID_RELATION_COUNT,
} from "../impactAnalyzer";

function createMockLogger() {
  return {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

type PreparedStatement = {
  get: Mock;
  all: Mock;
};

interface MockDb {
  prepare: Mock;
}

interface MockPlan {
  entityRow: { id: string; name: string; type: string } | undefined;
  neighborRows: Array<{
    id: string;
    relationType: string;
    direction: "incoming" | "outgoing";
    otherEntityId: string;
    otherEntityName: string | null;
    otherEntityType: string | null;
  }>;
  foreshadowRows: Array<{ id: string; name: string }>;
}

/**
 * Build a mock better-sqlite3 database that returns canned rows for each
 * of the three prepared statements used by impactAnalyzer, in prepare()
 * registration order.
 */
function buildMockDb(plan: MockPlan): MockDb {
  const statements: PreparedStatement[] = [
    { get: vi.fn().mockReturnValue(plan.entityRow), all: vi.fn() },
    { get: vi.fn(), all: vi.fn().mockReturnValue(plan.neighborRows) },
    { get: vi.fn(), all: vi.fn().mockReturnValue(plan.foreshadowRows) },
  ];
  let index = 0;
  return {
    prepare: vi.fn().mockImplementation(() => {
      const stmt = statements[index];
      index += 1;
      return stmt;
    }),
  };
}

const PROJECT_ID = "proj-1";
const ENTITY_ID = "ent-target";

describe("classifyImpactSeverity", () => {
  it("returns low when there are 0 or 1 relations and no foreshadows", () => {
    expect(
      classifyImpactSeverity({ relationCount: 0, unresolvedForeshadowCount: 0 }),
    ).toBe("low");
    expect(
      classifyImpactSeverity({ relationCount: 1, unresolvedForeshadowCount: 0 }),
    ).toBe("low");
  });

  it("returns mid at the MID_RELATION_COUNT boundary", () => {
    expect(
      classifyImpactSeverity({
        relationCount: MID_RELATION_COUNT,
        unresolvedForeshadowCount: 0,
      }),
    ).toBe("mid");
  });

  it("returns high at the HIGH_RELATION_COUNT boundary", () => {
    expect(
      classifyImpactSeverity({
        relationCount: HIGH_RELATION_COUNT,
        unresolvedForeshadowCount: 0,
      }),
    ).toBe("high");
  });

  it("returns high when there is any unresolved foreshadow below critical", () => {
    expect(
      classifyImpactSeverity({ relationCount: 0, unresolvedForeshadowCount: 1 }),
    ).toBe("high");
    expect(
      classifyImpactSeverity({ relationCount: 3, unresolvedForeshadowCount: 2 }),
    ).toBe("high");
  });

  it("returns critical at the CRITICAL_RELATION_COUNT boundary", () => {
    expect(
      classifyImpactSeverity({
        relationCount: CRITICAL_RELATION_COUNT,
        unresolvedForeshadowCount: 0,
      }),
    ).toBe("critical");
  });

  it("returns critical at the CRITICAL_UNRESOLVED_FORESHADOW_COUNT boundary", () => {
    expect(
      classifyImpactSeverity({
        relationCount: 0,
        unresolvedForeshadowCount: CRITICAL_UNRESOLVED_FORESHADOW_COUNT,
      }),
    ).toBe("critical");
  });
});

describe("createKgImpactAnalyzer.preview", () => {
  it("returns INVALID_ARGUMENT when projectId is blank", () => {
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: undefined,
        neighborRows: [],
        foreshadowRows: [],
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });
    const result = analyzer.preview({ projectId: "   ", entityId: ENTITY_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("returns INVALID_ARGUMENT when entityId is blank", () => {
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: undefined,
        neighborRows: [],
        foreshadowRows: [],
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });
    const result = analyzer.preview({ projectId: PROJECT_ID, entityId: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("returns NOT_FOUND when entity is missing", () => {
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: undefined,
        neighborRows: [],
        foreshadowRows: [],
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });
    const result = analyzer.preview({
      projectId: PROJECT_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("splits incoming / outgoing relations and computes severity", () => {
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: { id: ENTITY_ID, name: "Alice", type: "character" },
        neighborRows: [
          {
            id: "r1",
            relationType: "ally",
            direction: "incoming",
            otherEntityId: "ent-a",
            otherEntityName: "Bob",
            otherEntityType: "character",
          },
          {
            id: "r2",
            relationType: "located_at",
            direction: "outgoing",
            otherEntityId: "ent-b",
            otherEntityName: "Inn",
            otherEntityType: "location",
          },
        ],
        foreshadowRows: [],
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });

    const result = analyzer.preview({
      projectId: PROJECT_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entity.name).toBe("Alice");
    expect(result.data.incomingRelations).toHaveLength(1);
    expect(result.data.outgoingRelations).toHaveLength(1);
    expect(result.data.totalRelationCount).toBe(2);
    expect(result.data.unresolvedForeshadowCount).toBe(0);
    expect(result.data.severity).toBe("mid");
    expect(result.data.requiresTypedConfirmation).toBe(false);
    expect(result.data.queryCostMs).toBeGreaterThanOrEqual(0);
  });

  it("escalates to critical and requires typed confirmation when foreshadow threshold hit", () => {
    const foreshadowRows = Array.from(
      { length: CRITICAL_UNRESOLVED_FORESHADOW_COUNT },
      (_, i) => ({ id: `fs-${i}`, name: `Foreshadow ${i}` }),
    );
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: { id: ENTITY_ID, name: "Alice", type: "character" },
        neighborRows: [],
        foreshadowRows,
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });
    const result = analyzer.preview({
      projectId: PROJECT_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.severity).toBe("critical");
    expect(result.data.requiresTypedConfirmation).toBe(true);
    expect(result.data.affectedForeshadows).toHaveLength(
      CRITICAL_UNRESOLVED_FORESHADOW_COUNT,
    );
  });

  it("normalises missing neighbour name to empty string", () => {
    const analyzer = createKgImpactAnalyzer({
      db: buildMockDb({
        entityRow: { id: ENTITY_ID, name: "Alice", type: "character" },
        neighborRows: [
          {
            id: "r1",
            relationType: "ally",
            direction: "incoming",
            otherEntityId: "ent-missing",
            otherEntityName: null,
            otherEntityType: null,
          },
        ],
        foreshadowRows: [],
      }) as unknown as Parameters<typeof createKgImpactAnalyzer>[0]["db"],
      logger: createMockLogger(),
    });
    const result = analyzer.preview({
      projectId: PROJECT_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.incomingRelations[0]?.otherEntityName).toBe("");
    expect(result.data.incomingRelations[0]?.otherEntityType).toBeNull();
  });

  it("returns DB_ERROR when the database throws", () => {
    const failingDb = {
      prepare: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockImplementation(() => {
          throw new Error("boom");
        }),
        all: vi.fn(),
      })),
    };
    const logger = createMockLogger();
    const analyzer = createKgImpactAnalyzer({
      db: failingDb as unknown as Parameters<
        typeof createKgImpactAnalyzer
      >[0]["db"],
      logger,
    });
    const result = analyzer.preview({
      projectId: PROJECT_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DB_ERROR");
    expect(logger.error).toHaveBeenCalled();
  });
});
