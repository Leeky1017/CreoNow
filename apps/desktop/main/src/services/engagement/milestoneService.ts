/**
 * @module milestoneService
 * ## Responsibilities: Detect and persist project milestone crossings from world-scale metrics.
 * ## Does not do: LLM calls, IPC registration, UI toast rendering.
 * ## Dependency direction: DB layer + worldScale domain model only.
 * ## Invariants: INV-4 (structured data only), INV-10 (deterministic errors, no silent swallow).
 */

import type { DbLikeWithRun } from "./dbTypes";
import type { WorldScale } from "./worldScaleService";

export interface MilestoneEvent {
  readonly id: string;
  readonly projectId: string;
  readonly metric: string;
  readonly threshold: number;
  readonly value: number;
  readonly reachedAt: number;
}

export interface MilestoneReachedRow {
  readonly id: string;
  readonly projectId: string;
  readonly metric: string;
  readonly threshold: number;
  readonly value: number;
  readonly reachedAt: number;
  readonly createdAt: number;
}

export interface MilestoneService {
  evaluateAndRecord(args: {
    projectId: string;
    previous: WorldScale;
    current: WorldScale;
  }): MilestoneEvent[];
  evaluateFromCurrentScale(args: {
    projectId: string;
    current: WorldScale;
  }): MilestoneEvent[];
  listReached(projectId: string): MilestoneReachedRow[];
  dispose(): void;
}

type MilestoneMetricKey =
  | "characters"
  | "relations"
  | "totalWords"
  | "foreshadowings.resolved";

type MilestoneRule = {
  metric: MilestoneMetricKey;
  thresholds: readonly number[];
};

const RULES: readonly MilestoneRule[] = Object.freeze([
  { metric: "characters", thresholds: [50, 100, 200, 500] },
  { metric: "relations", thresholds: [100, 500, 1000] },
  { metric: "totalWords", thresholds: [10_000, 50_000, 100_000, 500_000] },
  { metric: "foreshadowings.resolved", thresholds: [5, 10, 20, 50] },
]);

const SQL_FIND_REACHED = `
  SELECT 1
  FROM project_milestones
  WHERE project_id = ?
    AND metric = ?
    AND threshold = ?
  LIMIT 1
`;

const SQL_INSERT_REACHED = `
  INSERT INTO project_milestones (
    id,
    project_id,
    metric,
    threshold,
    value,
    reached_at,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

const SQL_LIST_REACHED = `
  SELECT
    id,
    project_id AS projectId,
    metric,
    threshold,
    value,
    reached_at AS reachedAt,
    created_at AS createdAt
  FROM project_milestones
  WHERE project_id = ?
  ORDER BY reached_at ASC, metric ASC, threshold ASC
`;

function toMetricValue(scale: WorldScale, metric: MilestoneMetricKey): number {
  switch (metric) {
    case "characters":
      return scale.characters;
    case "relations":
      return scale.relations;
    case "totalWords":
      return scale.totalWords;
    case "foreshadowings.resolved":
      return scale.foreshadowings.resolved;
    default: {
      const _never: never = metric;
      return _never;
    }
  }
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function defaultIdFactory(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `milestone_${crypto.randomUUID()}`;
  }
  return `milestone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildBaselineFromReached(args: {
  current: WorldScale;
  reached: MilestoneReachedRow[];
}): WorldScale {
  let characters = 0;
  let relations = 0;
  let totalWords = 0;
  let foreshadowingResolved = 0;

  for (const row of args.reached) {
    if (row.metric === "characters") {
      characters = Math.max(characters, row.threshold);
      continue;
    }
    if (row.metric === "relations") {
      relations = Math.max(relations, row.threshold);
      continue;
    }
    if (row.metric === "totalWords") {
      totalWords = Math.max(totalWords, row.threshold);
      continue;
    }
    if (row.metric === "foreshadowings.resolved") {
      foreshadowingResolved = Math.max(foreshadowingResolved, row.threshold);
    }
  }

  return {
    ...args.current,
    characters,
    relations,
    totalWords,
    foreshadowings: {
      ...args.current.foreshadowings,
      resolved: foreshadowingResolved,
    },
  };
}

export interface MilestoneServiceDeps {
  db: DbLikeWithRun;
  nowMs?: () => number;
  idFactory?: () => string;
}

export function createMilestoneService(
  deps: MilestoneServiceDeps,
): MilestoneService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;
  const idFactory = deps.idFactory ?? defaultIdFactory;

  const stmtFindReached = db.prepare(SQL_FIND_REACHED);
  const stmtInsertReached = db.prepare(SQL_INSERT_REACHED);
  const stmtListReached = db.prepare(SQL_LIST_REACHED);
  let disposed = false;

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("MilestoneService has been disposed");
    }
  }

  const service: MilestoneService = {
    evaluateAndRecord(args): MilestoneEvent[] {
      assertNotDisposed();

      if (!args.projectId) {
        throw new Error("projectId is required");
      }

      const reachedEvents: MilestoneEvent[] = [];
      const now = nowMs();

      for (const rule of RULES) {
        const previous = normalizeCount(toMetricValue(args.previous, rule.metric));
        const current = normalizeCount(toMetricValue(args.current, rule.metric));
        if (current <= previous) {
          continue;
        }

        for (const threshold of rule.thresholds) {
          if (!(previous < threshold && current >= threshold)) {
            continue;
          }

          const exists = stmtFindReached.get(
            args.projectId,
            rule.metric,
            threshold,
          ) as Record<string, unknown> | undefined;
          if (exists) {
            continue;
          }

          const event: MilestoneEvent = {
            id: idFactory(),
            projectId: args.projectId,
            metric: rule.metric,
            threshold,
            value: current,
            reachedAt: now,
          };

          stmtInsertReached.run(
            event.id,
            event.projectId,
            event.metric,
            event.threshold,
            event.value,
            event.reachedAt,
            now,
          );
          reachedEvents.push(event);
        }
      }

      return reachedEvents;
    },

    evaluateFromCurrentScale(args): MilestoneEvent[] {
      assertNotDisposed();
      if (!args.projectId) {
        throw new Error("projectId is required");
      }
      const reached = service.listReached(args.projectId);
      const previous = buildBaselineFromReached({
        current: args.current,
        reached,
      });
      return service.evaluateAndRecord({
        projectId: args.projectId,
        previous,
        current: args.current,
      });
    },

    listReached(projectId: string): MilestoneReachedRow[] {
      assertNotDisposed();
      if (!projectId) {
        throw new Error("projectId is required");
      }
      const rows = stmtListReached.all(projectId) as Array<
        Record<string, unknown>
      >;
      return rows.map((row) => ({
        id: String(row.id ?? ""),
        projectId: String(row.projectId ?? ""),
        metric: String(row.metric ?? ""),
        threshold: normalizeCount(Number(row.threshold ?? 0)),
        value: normalizeCount(Number(row.value ?? 0)),
        reachedAt: normalizeCount(Number(row.reachedAt ?? 0)),
        createdAt: normalizeCount(Number(row.createdAt ?? 0)),
      }));
    },

    dispose(): void {
      disposed = true;
    },
  };

  return service;
}

export const MILESTONE_RULES = RULES;
