/**
 * @module impactAnalyzer
 *
 * ## Responsibilities
 * Read-only impact preview for KG entity deletion / destructive edits.
 * Given a target entity, enumerate the incoming / outgoing relations that
 * would be broken, and count the unresolved foreshadowing entities that
 * would be orphaned. Produce a severity classification used by the
 * renderer to choose between a light confirm dialog and a "type the name
 * to confirm" ritual (Linear-style).
 *
 * ## Does not do
 * No writes. No LLM calls. No Skill registration. No IPC wiring (see
 * `ipc/knowledgeGraph.ts`). No UI rendering.
 *
 * ## Dependency direction
 * DB Layer (better-sqlite3) only. Reads `kg_entities` and `kg_relations`.
 *
 * ## Invariants
 * - INV-1: This is a read-only preview. The actual delete still flows
 *   through `kgWriteOrchestrator` and Permission Gate; the preview only
 *   decides whether the UI should demand a typed confirmation.
 * - INV-4: Pure SQLite — no vector store, no LLM, no external service.
 *
 * ## Performance budget
 * < 50ms for a single-entity preview even on 5k-node graphs. Backed by
 * existing `idx_kg_relations_source_target` indexes and a single scan of
 * unresolved foreshadowing entities.
 *
 * ## Severity ladder (magic numbers have a reason)
 * Source: issue #195 acceptance criteria + engagement-engine.md 机制 14
 * (禀赋效应). Higher severity = stronger confirmation ritual.
 *
 * - critical — ≥ {@link CRITICAL_RELATION_COUNT} relations OR
 *   ≥ {@link CRITICAL_UNRESOLVED_FORESHADOW_COUNT} unresolved foreshadows.
 *   Requires the user to type the entity name to unlock delete.
 * - high     — ≥ {@link HIGH_RELATION_COUNT} relations OR ≥ 1 unresolved
 *   foreshadow. Strong warning copy + destructive primary button.
 * - mid      — ≥ {@link MID_RELATION_COUNT} relations. Standard warning.
 * - low      — Below all thresholds. Lightweight confirmation.
 *
 * Why these numbers: 10 / 3 match the issue body verbatim; 5 / 2 are
 * chosen to give a smooth ladder where each step doubles roughly, so
 * users do not see a sudden jump from "no confirmation needed" to
 * "type the name". Change these only together with the UX copy. *
 * Thresholds are **heuristic** — v1 baseline. They are unsourced product
 * judgement and must be tuned against real telemetry before calling them
 * final. Tune via Issue #195 follow-up or by folding ENG-21 milestone
 * event feedback into the severity decision.
 * TODO(leeky 2026-06-30): replace heuristics with telemetry-driven
 * thresholds once we have 4+ weeks of production confirm/cancel counters. */

import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import type { Err, ServiceResult } from "./types";
import { ipcError } from "../shared/ipcResult";

export const CRITICAL_RELATION_COUNT = 10;
export const CRITICAL_UNRESOLVED_FORESHADOW_COUNT = 3;
export const HIGH_RELATION_COUNT = 5;
export const MID_RELATION_COUNT = 2;

export type KgImpactSeverity = "low" | "mid" | "high" | "critical";

export type KgImpactRelationPreview = {
  id: string;
  relationType: string;
  /** Direction relative to the target entity. */
  direction: "incoming" | "outgoing";
  /** The *other* entity id on this relation. */
  otherEntityId: string;
  /** The *other* entity name; empty string if the entity is missing. */
  otherEntityName: string;
  /** The *other* entity type, or `null` if missing. */
  otherEntityType: string | null;
};

export type KgImpactForeshadowPreview = {
  id: string;
  name: string;
};

export type KgImpactPreview = {
  entity: {
    id: string;
    name: string;
    type: string;
  };
  incomingRelations: readonly KgImpactRelationPreview[];
  outgoingRelations: readonly KgImpactRelationPreview[];
  affectedForeshadows: readonly KgImpactForeshadowPreview[];
  totalRelationCount: number;
  unresolvedForeshadowCount: number;
  severity: KgImpactSeverity;
  /** Whether the UI must require the user to type the entity name. */
  requiresTypedConfirmation: boolean;
  /**
   * Opaque fingerprint of the project's KG revision at preview time. The
   * renderer passes this back on `entity:delete` as `confirmationToken`.
   * If the KG has been mutated by a concurrent write between preview and
   * confirm, the backend recomputes the fingerprint, notices the drift,
   * and returns `KG_STALE_PREVIEW` — forcing the renderer to refetch and
   * re-confirm instead of deleting against stale assumptions (B3).
   */
  revisionFingerprint: string;
  queryCostMs: number;
};

export type KgImpactAnalyzer = {
  preview(args: {
    projectId: string;
    entityId: string;
  }): ServiceResult<KgImpactPreview>;
  /**
   * Recompute just the project revision fingerprint. Used by the
   * `knowledge:entity:delete` gate to detect stale previews without
   * recomputing the full relation/foreshadow scan.
   */
  computeRevisionFingerprint(args: {
    entityId?: string;
    projectId: string;
  }): ServiceResult<{ fingerprint: string }>;
};

type EntityRow = {
  id: string;
  name: string;
  type: string;
};

type RelationNeighborRow = {
  id: string;
  relationType: string;
  direction: "incoming" | "outgoing";
  otherEntityId: string;
  otherEntityName: string | null;
  otherEntityType: string | null;
};

type ForeshadowRow = {
  id: string;
  name: string;
};

type TableInfoRow = {
  name: string;
};

/**
 * Decide severity from relation / foreshadow counts.
 *
 * Exported for unit tests — severity thresholds are product decisions and
 * must stay covered by tests so that accidental changes fail CI.
 */
export function classifyImpactSeverity(args: {
  relationCount: number;
  unresolvedForeshadowCount: number;
}): KgImpactSeverity {
  if (
    args.relationCount >= CRITICAL_RELATION_COUNT ||
    args.unresolvedForeshadowCount >= CRITICAL_UNRESOLVED_FORESHADOW_COUNT
  ) {
    return "critical";
  }
  if (args.relationCount >= HIGH_RELATION_COUNT || args.unresolvedForeshadowCount >= 1) {
    return "high";
  }
  if (args.relationCount >= MID_RELATION_COUNT) {
    return "mid";
  }
  return "low";
}

function validateInputs(args: {
  projectId: string;
  entityId: string;
}): Err | null {
  if (args.projectId.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", "projectId is required");
  }
  if (args.entityId.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", "entityId is required");
  }
  return null;
}

export function createKgImpactAnalyzer(deps: {
  db: Database.Database;
  logger: Logger;
}): KgImpactAnalyzer {
  const { db, logger } = deps;

  function resolveTimestampColumn(
    tableName: "kg_entities" | "kg_relations",
  ): "updated_at" | "created_at" {
    try {
      const columns = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as TableInfoRow[];
      const names = new Set(
        columns
          .map((column) => column.name)
          .filter((name): name is string => typeof name === "string"),
      );
      if (names.has("updated_at")) {
        return "updated_at";
      }
    } catch {
      // Fall through to created_at for older schemas or lightweight harnesses.
    }
    return "created_at";
  }

  const entityTimestampColumn = resolveTimestampColumn("kg_entities");
  const relationTimestampColumn = resolveTimestampColumn("kg_relations");

  // Pull the target entity. Scoped by project_id to prevent cross-project
  // leakage even if the renderer passes a mismatched pair.
  const selectEntity = db.prepare<
    [string, string],
    EntityRow
  >(
    "SELECT id, name, type FROM kg_entities WHERE project_id = ? AND id = ? LIMIT 1",
  );

  // Neighbour relations in a single query using UNION ALL so we keep one
  // round-trip instead of two (perf budget is 50ms). Joining kg_entities to
  // fetch the neighbour's name/type in the same pass lets the renderer show
  // a useful summary without a second query.
  const selectNeighborRelations = db.prepare<
    [string, string, string, string],
    RelationNeighborRow
  >(
    `SELECT r.id AS id,
            r.relation_type AS relationType,
            'incoming' AS direction,
            r.source_entity_id AS otherEntityId,
            (SELECT name FROM kg_entities WHERE id = r.source_entity_id) AS otherEntityName,
            (SELECT type FROM kg_entities WHERE id = r.source_entity_id) AS otherEntityType
       FROM kg_relations r
      WHERE r.project_id = ? AND r.target_entity_id = ?
      UNION ALL
     SELECT r.id AS id,
            r.relation_type AS relationType,
            'outgoing' AS direction,
            r.target_entity_id AS otherEntityId,
            (SELECT name FROM kg_entities WHERE id = r.target_entity_id) AS otherEntityName,
            (SELECT type FROM kg_entities WHERE id = r.target_entity_id) AS otherEntityType
       FROM kg_relations r
      WHERE r.project_id = ? AND r.source_entity_id = ?`,
  );

  // Unresolved foreshadow entities that are connected (in either direction)
  // to the target via kg_relations. `json_extract ... IS NOT 1` covers both
  // NULL (never resolved) and explicit 0, matching foreshadowingTracker.
  const selectAffectedForeshadows = db.prepare<
    [string, string, string, string],
    ForeshadowRow
  >(
    `SELECT DISTINCT e.id AS id, e.name AS name
       FROM kg_entities e
       JOIN kg_relations r
         ON (r.source_entity_id = e.id OR r.target_entity_id = e.id)
      WHERE e.project_id = ?
        AND e.type = 'foreshadowing'
        AND json_extract(e.attributes_json, '$.resolved') IS NOT 1
        AND r.project_id = ?
        AND (r.source_entity_id = ? OR r.target_entity_id = ?)`,
  );

  // Fingerprint query — cheap scan over both kg_entities and kg_relations,
  // scoped by project_id. We concatenate count + MAX(updated_at) for each
  // table so any insert / update / delete inside the project bumps the
  // fingerprint. Opaque to the renderer; only equality matters.
  const selectRevisionFingerprint = db.prepare<
    [string, string],
    { entities: string; relations: string }
  >(
    `SELECT
       (SELECT COUNT(*) || ':' || COALESCE(MAX(${entityTimestampColumn}), '0')
          FROM kg_entities  WHERE project_id = ?) AS entities,
       (SELECT COUNT(*) || ':' || COALESCE(MAX(${relationTimestampColumn}), '0')
          FROM kg_relations WHERE project_id = ?) AS relations`,
  );

  function readFingerprint(projectId: string, entityId?: string): string {
    const row = selectRevisionFingerprint.get(projectId, projectId);
    // Row is guaranteed by SQL shape; fall back to an empty fingerprint if
    // the driver returns undefined so downstream equality fails loudly
    // rather than silently matching.
    const baseFingerprint = row ? `e=${row.entities};r=${row.relations}` : "e=;r=";
    if (typeof entityId !== "string" || entityId.trim().length === 0) {
      return baseFingerprint;
    }
    return `id=${entityId.trim()};${baseFingerprint}`;
  }

  return {
    computeRevisionFingerprint({ projectId, entityId }) {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }
      try {
        return {
          ok: true,
          data: { fingerprint: readFingerprint(projectId.trim(), entityId) },
        };
      } catch (error) {
        logger.error("kg_impact_fingerprint_failed", {
          entityId,
          projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to compute KG revision fingerprint");
      }
    },
    preview({ projectId, entityId }) {
      const invalid = validateInputs({ projectId, entityId });
      if (invalid) {
        return invalid;
      }

      const normalizedProjectId = projectId.trim();
      const normalizedEntityId = entityId.trim();
      const startedAt = Date.now();

      try {
        const entityRow = selectEntity.get(
          normalizedProjectId,
          normalizedEntityId,
        );
        if (!entityRow) {
          return ipcError("NOT_FOUND", "Entity not found");
        }

        const neighborRows = selectNeighborRelations.all(
          normalizedProjectId,
          normalizedEntityId,
          normalizedProjectId,
          normalizedEntityId,
        );

        const incoming: KgImpactRelationPreview[] = [];
        const outgoing: KgImpactRelationPreview[] = [];
        for (const row of neighborRows) {
          const preview: KgImpactRelationPreview = {
            id: row.id,
            relationType: row.relationType,
            direction: row.direction,
            otherEntityId: row.otherEntityId,
            otherEntityName: row.otherEntityName ?? "",
            otherEntityType: row.otherEntityType,
          };
          if (row.direction === "incoming") {
            incoming.push(preview);
          } else {
            outgoing.push(preview);
          }
        }

        // `entityRow.type === 'foreshadowing'` is intentionally included in
        // the unresolved count when counted through the affected set below;
        // deleting a foreshadow entity itself is a high-impact action.
        const foreshadowRows = selectAffectedForeshadows.all(
          normalizedProjectId,
          normalizedProjectId,
          normalizedEntityId,
          normalizedEntityId,
        );

        const totalRelationCount = incoming.length + outgoing.length;
        const unresolvedForeshadowCount = foreshadowRows.length;
        const severity = classifyImpactSeverity({
          relationCount: totalRelationCount,
          unresolvedForeshadowCount,
        });
        const requiresTypedConfirmation = severity === "critical";

        return {
          ok: true,
          data: {
            entity: {
              id: entityRow.id,
              name: entityRow.name,
              type: entityRow.type,
            },
            incomingRelations: incoming,
            outgoingRelations: outgoing,
            affectedForeshadows: foreshadowRows.map((row) => ({
              id: row.id,
              name: row.name,
            })),
            totalRelationCount,
            unresolvedForeshadowCount,
            severity,
            requiresTypedConfirmation,
            revisionFingerprint: readFingerprint(
              normalizedProjectId,
              normalizedEntityId,
            ),
            queryCostMs: Date.now() - startedAt,
          },
        };
      } catch (error) {
        logger.error("kg_impact_preview_failed", {
          projectId: normalizedProjectId,
          entityId: normalizedEntityId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to compute impact preview");
      }
    },
  };
}
