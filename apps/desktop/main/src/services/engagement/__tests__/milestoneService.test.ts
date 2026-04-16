import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createMilestoneService,
  type MilestoneService,
} from "../milestoneService";
import type { DbLikeWithRun } from "../dbTypes";
import type { WorldScale } from "../worldScaleService";

const PROJECT_ID = "proj-milestone-001";
const NOW = 1_700_000_000_000;

const ZERO_SCALE: WorldScale = {
  totalWords: 0,
  characters: 0,
  relations: 0,
  locations: 0,
  foreshadowings: { total: 0, resolved: 0 },
  chapters: 0,
};

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE project_milestones (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      metric      TEXT NOT NULL,
      threshold   INTEGER NOT NULL,
      value       INTEGER NOT NULL,
      reached_at  INTEGER NOT NULL,
      created_at  INTEGER NOT NULL,
      UNIQUE(project_id, metric, threshold)
    );
  `);
  return db;
}

describe("MilestoneService", () => {
  let db: Database.Database;
  let now = NOW;
  let idSeq = 0;
  let service: MilestoneService;

  beforeEach(() => {
    db = createDb();
    now = NOW;
    idSeq = 0;
    service = createMilestoneService({
      db: db as unknown as DbLikeWithRun,
      nowMs: () => now,
      idFactory: () => `mile-${++idSeq}`,
    });
  });

  afterEach(() => {
    service.dispose();
    db.close();
  });

  it("does not trigger when no threshold is crossed", () => {
    const events = service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: ZERO_SCALE,
      current: {
        ...ZERO_SCALE,
        characters: 12,
        relations: 45,
        totalWords: 9000,
      },
    });

    expect(events).toEqual([]);
    expect(service.listReached(PROJECT_ID)).toEqual([]);
  });

  it("records first threshold crossing per metric", () => {
    const events = service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, characters: 49 },
      current: { ...ZERO_SCALE, characters: 50 },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "mile-1",
      projectId: PROJECT_ID,
      metric: "characters",
      threshold: 50,
      value: 50,
      reachedAt: NOW,
    });

    const rows = service.listReached(PROJECT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "mile-1",
      metric: "characters",
      threshold: 50,
      value: 50,
      reachedAt: NOW,
      createdAt: NOW,
    });
  });

  it("supports multiple threshold crossings in one update", () => {
    const events = service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, totalWords: 9_000 },
      current: { ...ZERO_SCALE, totalWords: 110_000 },
    });

    expect(events.map((event) => event.threshold)).toEqual([
      10_000,
      50_000,
      100_000,
    ]);
    expect(events.every((event) => event.metric === "totalWords")).toBe(true);
  });

  it("handles nested metric foreshadowings.resolved", () => {
    const events = service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: {
        ...ZERO_SCALE,
        foreshadowings: { total: 24, resolved: 4 },
      },
      current: {
        ...ZERO_SCALE,
        foreshadowings: { total: 26, resolved: 11 },
      },
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      metric: "foreshadowings.resolved",
      threshold: 5,
      value: 11,
    });
    expect(events[1]).toMatchObject({
      metric: "foreshadowings.resolved",
      threshold: 10,
      value: 11,
    });
  });

  it("does not duplicate already reached milestone", () => {
    service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, relations: 99 },
      current: { ...ZERO_SCALE, relations: 120 },
    });

    const second = service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, relations: 120 },
      current: { ...ZERO_SCALE, relations: 240 },
    });

    expect(second).toEqual([]);
    expect(service.listReached(PROJECT_ID)).toHaveLength(1);
  });

  it("evaluates current scale against persisted thresholds", () => {
    service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, totalWords: 9_000 },
      current: { ...ZERO_SCALE, totalWords: 12_000 },
    });

    const nextEvents = service.evaluateFromCurrentScale({
      projectId: PROJECT_ID,
      current: { ...ZERO_SCALE, totalWords: 60_000 },
    });

    expect(nextEvents).toHaveLength(1);
    expect(nextEvents[0]).toMatchObject({
      metric: "totalWords",
      threshold: 50_000,
      value: 60_000,
    });
  });

  it("orders reached rows by reached_at, metric, threshold", () => {
    service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, characters: 49 },
      current: { ...ZERO_SCALE, characters: 55 },
    });
    now += 1000;
    service.evaluateAndRecord({
      projectId: PROJECT_ID,
      previous: { ...ZERO_SCALE, relations: 99 },
      current: { ...ZERO_SCALE, relations: 102 },
    });

    const rows = service.listReached(PROJECT_ID);
    expect(rows.map((row) => row.id)).toEqual(["mile-1", "mile-2"]);
  });

  it("validates projectId and disposed lifecycle", () => {
    expect(() =>
      service.evaluateAndRecord({
        projectId: "",
        previous: ZERO_SCALE,
        current: ZERO_SCALE,
      }),
    ).toThrow("projectId is required");
    expect(() => service.listReached("")).toThrow("projectId is required");

    service.dispose();
    expect(() =>
      service.evaluateAndRecord({
        projectId: PROJECT_ID,
        previous: ZERO_SCALE,
        current: ZERO_SCALE,
      }),
    ).toThrow("MilestoneService has been disposed");
  });
});
