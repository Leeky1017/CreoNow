import React from "react";

import { Button, Card, Input, Select, Text } from "../../components/primitives";
import { SystemDialog } from "../../components/features/AiDialogs/SystemDialog";
import { KnowledgeGraph } from "../../components/features/KnowledgeGraph/KnowledgeGraph";
import type {
  CanvasTransform,
  GraphNode,
  NodeType,
} from "../../components/features/KnowledgeGraph/types";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useKgStore } from "../../stores/kgStore";
import { TimelineView, type TimelineEventItem } from "./TimelineView";
import { buildForceDirectedGraph } from "./graphRenderAdapter";
import {
  createEntityMetadataWithPosition,
  kgToGraph,
  updatePositionInMetadata,
} from "./kgToGraph";
import {
  loadKgViewPreferences,
  saveKgViewPreferences,
} from "./kgViewPreferences";

type EditingState =
  | { mode: "idle" }
  | {
      mode: "entity";
      entityId: string;
      name: string;
      entityType: string;
      description: string;
    }
  | { mode: "relation"; relationId: string; relationType: string };

/** View mode for the KG panel */
type ViewMode = "list" | "graph" | "timeline";

function entityLabel(args: { name: string; entityType?: string }): string {
  return args.entityType ? `${args.name} (${args.entityType})` : args.name;
}

/**
 * Map NodeType to KG entity type string.
 */
function nodeTypeToEntityType(nodeType: NodeType): string {
  return nodeType === "other" ? "" : nodeType;
}

function parseMetadataJson(metadataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function updateTimelineOrderInMetadata(
  metadataJson: string,
  order: number,
): string {
  const metadata = parseMetadataJson(metadataJson);
  const timeline = (metadata.timeline as Record<string, unknown>) ?? {};
  timeline.order = order;
  metadata.timeline = timeline;
  return JSON.stringify(metadata);
}

/**
 * ViewModeToggle - Toggle buttons for List/Graph view.
 *
 * Why: Extracted to avoid TypeScript narrowing issues in parent component.
 */
function ViewModeToggle(props: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}): JSX.Element {
  const entries: Array<{ mode: ViewMode; label: string }> = [
    { mode: "graph", label: "Graph" },
    { mode: "timeline", label: "Timeline" },
    { mode: "list", label: "List" },
  ];
  return (
    <div className="flex items-center gap-1">
      {entries.map((entry) => (
        <button
          key={entry.mode}
          type="button"
          onClick={() => props.onViewModeChange(entry.mode)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            props.viewMode === entry.mode
              ? "bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]"
              : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)]"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}

/**
 * KnowledgeGraphPanel renders the KG CRUD surface with List and Graph views.
 *
 * Why: P0 requires KG discoverability (sidebar entry), CRUD, and predictable
 * data for context injection. Graph view provides visual exploration.
 */
export function KnowledgeGraphPanel(props: { projectId: string }): JSX.Element {
  const bootstrapStatus = useKgStore((s) => s.bootstrapStatus);
  const entities = useKgStore((s) => s.entities);
  const relations = useKgStore((s) => s.relations);
  const lastError = useKgStore((s) => s.lastError);

  const bootstrapForProject = useKgStore((s) => s.bootstrapForProject);
  const clearError = useKgStore((s) => s.clearError);

  const entityCreate = useKgStore((s) => s.entityCreate);
  const entityUpdate = useKgStore((s) => s.entityUpdate);
  const entityDelete = useKgStore((s) => s.entityDelete);

  const { confirm, dialogProps } = useConfirmDialog();

  const relationCreate = useKgStore((s) => s.relationCreate);
  const relationUpdate = useKgStore((s) => s.relationUpdate);
  const relationDelete = useKgStore((s) => s.relationDelete);

  const [editing, setEditing] = React.useState<EditingState>({ mode: "idle" });
  const [viewMode, setViewMode] = React.useState<ViewMode>("graph");
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [graphTransform, setGraphTransform] = React.useState<CanvasTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const [createName, setCreateName] = React.useState("");
  const [createType, setCreateType] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");

  const [relFromId, setRelFromId] = React.useState("");
  const [relToId, setRelToId] = React.useState("");
  const [relType, setRelType] = React.useState("");

  const isReady = bootstrapStatus === "ready";

  React.useEffect(() => {
    void bootstrapForProject(props.projectId);
  }, [bootstrapForProject, props.projectId]);

  React.useEffect(() => {
    const preference = loadKgViewPreferences(props.projectId);
    setGraphTransform(preference.graphTransform);
  }, [props.projectId]);

  React.useEffect(() => {
    if (entities.length === 0) {
      setRelFromId("");
      setRelToId("");
      return;
    }
    if (!entities.some((e) => e.entityId === relFromId)) {
      setRelFromId(entities[0]!.entityId);
    }
    if (!entities.some((e) => e.entityId === relToId)) {
      const fallback = entities[1]?.entityId ?? entities[0]!.entityId;
      setRelToId(fallback);
    }
  }, [entities, relFromId, relToId]);

  async function onCreateEntity(): Promise<void> {
    const res = await entityCreate({
      name: createName,
      entityType: createType,
      description: createDescription,
    });
    if (!res.ok) {
      return;
    }
    setCreateName("");
    setCreateType("");
    setCreateDescription("");
  }

  async function onDeleteEntity(entityId: string): Promise<void> {
    const confirmed = await confirm({
      title: "Delete Entity?",
      description:
        "This entity and all its relations will be permanently deleted.",
      primaryLabel: "Delete",
      secondaryLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }
    await entityDelete({ entityId });
    if (editing.mode === "entity" && editing.entityId === entityId) {
      setEditing({ mode: "idle" });
    }
  }

  /**
   * Confirm then delete a relation.
   *
   * Why: destructive KG actions must use SystemDialog for consistent UX and E2E.
   */
  async function onDeleteRelation(relationId: string): Promise<void> {
    const confirmed = await confirm({
      title: "Delete Relation?",
      description: "This relation will be permanently deleted.",
      primaryLabel: "Delete",
      secondaryLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }
    await relationDelete({ relationId });
    if (editing.mode === "relation" && editing.relationId === relationId) {
      setEditing({ mode: "idle" });
    }
  }

  async function onSaveEdit(): Promise<void> {
    if (editing.mode === "entity") {
      const res = await entityUpdate({
        entityId: editing.entityId,
        patch: {
          name: editing.name,
          entityType: editing.entityType,
          description: editing.description,
        },
      });
      if (!res.ok) {
        return;
      }
      setEditing({ mode: "idle" });
      return;
    }

    if (editing.mode === "relation") {
      const res = await relationUpdate({
        relationId: editing.relationId,
        patch: { relationType: editing.relationType },
      });
      if (!res.ok) {
        return;
      }
      setEditing({ mode: "idle" });
      return;
    }
  }

  async function onCreateRelation(): Promise<void> {
    if (entities.length === 0) {
      return;
    }
    const res = await relationCreate({
      fromEntityId: relFromId,
      toEntityId: relToId,
      relationType: relType,
    });
    if (!res.ok) {
      return;
    }
    setRelType("");
  }

  function getEntityName(entityId: string): string {
    const e = entities.find((x) => x.entityId === entityId);
    return e ? e.name : entityId;
  }

  const baseGraphData = React.useMemo(
    () => kgToGraph(entities, relations),
    [entities, relations],
  );

  // Build force-directed positions via adapter (d3-force).
  const graphData = React.useMemo(
    () => buildForceDirectedGraph(baseGraphData),
    [baseGraphData],
  );

  const timelineEvents = React.useMemo<TimelineEventItem[]>(() => {
    return entities
      .filter((entity) => entity.entityType === "event")
      .map((entity, index) => {
        const metadata = parseMetadataJson(entity.metadataJson);
        const timeline = (metadata.timeline as Record<string, unknown>) ?? {};
        const chapterValue = timeline.chapter;
        const orderValue = timeline.order;
        return {
          id: entity.entityId,
          title: entity.name,
          chapter:
            typeof chapterValue === "string" && chapterValue.length > 0
              ? chapterValue
              : `Chapter-${String(index + 1).padStart(2, "0")}`,
          order: typeof orderValue === "number" ? orderValue : index + 1,
          description: entity.description ?? undefined,
        };
      });
  }, [entities]);

  /**
   * Handle node position change (drag) in graph view.
   * Persists position to entity metadataJson.
   */
  async function onNodeMove(
    nodeId: string,
    position: { x: number; y: number },
  ): Promise<void> {
    const entity = entities.find((e) => e.entityId === nodeId);
    if (!entity) {
      return;
    }

    const updatedMetadata = updatePositionInMetadata(
      entity.metadataJson,
      position,
    );

    await entityUpdate({
      entityId: nodeId,
      patch: { metadataJson: updatedMetadata },
    });

    saveKgViewPreferences(props.projectId, { lastDraggedNodeId: nodeId });
  }

  function onGraphTransformChange(transform: CanvasTransform): void {
    setGraphTransform((current) => {
      if (
        current.scale === transform.scale &&
        current.translateX === transform.translateX &&
        current.translateY === transform.translateY
      ) {
        return current;
      }
      return transform;
    });
    saveKgViewPreferences(props.projectId, { graphTransform: transform });
  }

  async function onTimelineOrderChange(orderedIds: string[]): Promise<void> {
    saveKgViewPreferences(props.projectId, { timelineOrder: orderedIds });

    const byId = new Map(entities.map((entity) => [entity.entityId, entity]));
    await Promise.all(
      orderedIds.map(async (entityId, index) => {
        const entity = byId.get(entityId);
        if (!entity || entity.entityType !== "event") {
          return;
        }
        const metadataJson = updateTimelineOrderInMetadata(
          entity.metadataJson,
          index + 1,
        );
        await entityUpdate({
          entityId,
          patch: { metadataJson },
        });
      }),
    );
  }

  /**
   * Handle add node from graph view.
   */
  async function onAddNode(nodeType: NodeType): Promise<void> {
    // Calculate position for new node (center of visible area)
    const position = { x: 300, y: 200 };

    const res = await entityCreate({
      name: "New Entity",
      entityType: nodeTypeToEntityType(nodeType),
      description: "",
    });

    if (res.ok) {
      // Update with position metadata
      const metadata = createEntityMetadataWithPosition(nodeType, position);
      await entityUpdate({
        entityId: res.data.entityId,
        patch: { metadataJson: metadata },
      });
      setSelectedNodeId(res.data.entityId);
    }
  }

  /**
   * Handle node save from graph edit dialog.
   */
  async function onNodeSave(node: GraphNode, isNew: boolean): Promise<void> {
    if (isNew) {
      // Create new entity
      const res = await entityCreate({
        name: node.label,
        entityType: node.type === "other" ? "" : node.type,
        description: node.metadata?.description ?? "",
      });

      if (res.ok) {
        const metadata = createEntityMetadataWithPosition(node.type, node.position);
        await entityUpdate({
          entityId: res.data.entityId,
          patch: { metadataJson: metadata },
        });
        setSelectedNodeId(res.data.entityId);
      }
    } else {
      // Update existing entity
      const entity = entities.find((e) => e.entityId === node.id);
      if (!entity) return;

      const updatedMetadata = updatePositionInMetadata(
        entity.metadataJson,
        node.position,
      );

      await entityUpdate({
        entityId: node.id,
        patch: {
          name: node.label,
          entityType: node.type === "other" ? "" : node.type,
          description: node.metadata?.description ?? "",
          metadataJson: updatedMetadata,
        },
      });
    }
  }

  /**
   * Handle node delete from graph view.
   */
  async function onNodeDeleteFromGraph(nodeId: string): Promise<void> {
    await onDeleteEntity(nodeId);
    setSelectedNodeId(null);
  }

  // Render Graph view
  if (viewMode === "graph") {
    return (
      <section data-testid="sidebar-kg" className="flex flex-col h-full min-h-0">
        {/* Header with view toggle */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)] shrink-0">
          <Text size="small" color="muted">
            Knowledge Graph
          </Text>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Error display */}
        {lastError ? (
          <div
            role="alert"
            className="p-3 border-b border-[var(--color-separator)] shrink-0"
          >
            <div className="flex gap-2 items-center">
              <Text data-testid="kg-error-code" size="code" color="muted">
                {lastError.code}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
            <Text size="small" className="mt-1.5 block">
              {lastError.message}
            </Text>
          </div>
        ) : null}

        {/* Graph visualization */}
        <div className="flex-1 min-h-0">
          <KnowledgeGraph
            data={graphData}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeMove={(nodeId, pos) => void onNodeMove(nodeId, pos)}
            onAddNode={(type) => void onAddNode(type)}
            onNodeSave={(node, isNew) => void onNodeSave(node, isNew)}
            onNodeDelete={(nodeId) => void onNodeDeleteFromGraph(nodeId)}
            initialTransform={graphTransform}
            onTransformChange={onGraphTransformChange}
            enableEditDialog={true}
          />
        </div>

        <SystemDialog {...dialogProps} />
      </section>
    );
  }

  if (viewMode === "timeline") {
    return (
      <section data-testid="sidebar-kg" className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)] shrink-0">
          <Text size="small" color="muted">
            Knowledge Graph
          </Text>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        <div className="flex-1 min-h-0">
          <TimelineView
            events={timelineEvents}
            onOrderChange={(orderedIds) => void onTimelineOrderChange(orderedIds)}
            onOpenEvent={(eventId) => {
              const eventEntity = entities.find((entity) => entity.entityId === eventId);
              if (!eventEntity) {
                return;
              }
              setEditing({
                mode: "entity",
                entityId: eventEntity.entityId,
                name: eventEntity.name,
                entityType: eventEntity.entityType,
                description: eventEntity.description ?? "",
              });
            }}
          />
        </div>

        <SystemDialog {...dialogProps} />
      </section>
    );
  }

  // Render List view (original)
  return (
    <section data-testid="sidebar-kg" className="flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)]">
        <Text size="small" color="muted">
          Knowledge Graph
        </Text>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {lastError ? (
        <div
          role="alert"
          className="p-3 border-b border-[var(--color-separator)]"
        >
          <div className="flex gap-2 items-center">
            <Text data-testid="kg-error-code" size="code" color="muted">
              {lastError.code}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearError}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
          <Text size="small" className="mt-1.5 block">
            {lastError.message}
          </Text>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-3">
          <Text size="small" color="muted">
            Entities
          </Text>

          <div className="flex flex-col gap-2 mt-2 pb-3 border-b border-[var(--color-separator)]">
            <Input
              data-testid="kg-entity-name"
              placeholder="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              fullWidth
            />
            <Input
              placeholder="Type (optional)"
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
              fullWidth
            />
            <Input
              placeholder="Description (optional)"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              fullWidth
            />
            <Button
              data-testid="kg-entity-create"
              variant="secondary"
              size="sm"
              onClick={() => void onCreateEntity()}
              disabled={!isReady}
              className="self-start"
            >
              Create entity
            </Button>
          </div>

          {entities.length === 0 ? (
            <Text size="small" color="muted" className="mt-3 block">
              No entities yet.
            </Text>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {entities.map((e) => {
                const isEditing =
                  editing.mode === "entity" && editing.entityId === e.entityId;
                return (
                  <Card
                    key={e.entityId}
                    data-testid={`kg-entity-row-${e.entityId}`}
                    noPadding
                    className="p-2.5 flex flex-col gap-2"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editing.name}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              name: evt.target.value,
                            })
                          }
                          fullWidth
                        />
                        <Input
                          value={editing.entityType}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              entityType: evt.target.value,
                            })
                          }
                          fullWidth
                        />
                        <Input
                          value={editing.description}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              description: evt.target.value,
                            })
                          }
                          fullWidth
                        />
                      </>
                    ) : (
                      <>
                        <Text size="small">
                          {entityLabel({
                            name: e.name,
                            entityType: e.entityType,
                          })}
                        </Text>
                        {e.description ? (
                          <Text size="small" color="muted">
                            {e.description}
                          </Text>
                        ) : null}
                      </>
                    )}

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void onSaveEdit()}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing({ mode: "idle" })}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditing({
                                mode: "entity",
                                entityId: e.entityId,
                                name: e.name,
                                entityType: e.entityType ?? "",
                                description: e.description ?? "",
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            data-testid={`kg-entity-delete-${e.entityId}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => void onDeleteEntity(e.entityId)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Text size="small" color="muted">
              Relations
            </Text>

            <div className="mt-2 flex flex-col gap-2 pb-3 border-b border-[var(--color-separator)]">
              <Select
                value={relFromId}
                onValueChange={(value) => setRelFromId(value)}
                disabled={!isReady || entities.length === 0}
                options={entities.map((e) => ({
                  value: e.entityId,
                  label: entityLabel({
                    name: e.name,
                    entityType: e.entityType,
                  }),
                }))}
                placeholder="Select entity..."
                fullWidth
              />

              <Select
                value={relToId}
                onValueChange={(value) => setRelToId(value)}
                disabled={!isReady || entities.length === 0}
                options={entities.map((e) => ({
                  value: e.entityId,
                  label: entityLabel({
                    name: e.name,
                    entityType: e.entityType,
                  }),
                }))}
                placeholder="Select entity..."
                fullWidth
              />

              <Input
                data-testid="kg-relation-type"
                placeholder="Relation type (e.g. knows)"
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                disabled={!isReady}
                fullWidth
              />

              <Button
                data-testid="kg-relation-create"
                variant="secondary"
                size="sm"
                onClick={() => void onCreateRelation()}
                disabled={!isReady}
                className="self-start"
              >
                Create relation
              </Button>
            </div>

            {relations.length === 0 ? (
              <Text size="small" color="muted" className="mt-3 block">
                No relations yet.
              </Text>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {relations.map((r) => {
                  const isEditing =
                    editing.mode === "relation" &&
                    editing.relationId === r.relationId;
                  return (
                    <Card
                      key={r.relationId}
                      data-testid={`kg-relation-row-${r.relationId}`}
                      noPadding
                      className="p-2.5 flex flex-col gap-2"
                    >
                      {isEditing ? (
                        <Input
                          value={editing.relationType}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              relationType: evt.target.value,
                            })
                          }
                          fullWidth
                        />
                      ) : (
                        <Text size="small">
                          {getEntityName(r.fromEntityId)} -({r.relationType})→{" "}
                          {getEntityName(r.toEntityId)}
                        </Text>
                      )}

                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void onSaveEdit()}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing({ mode: "idle" })}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditing({
                                  mode: "relation",
                                  relationId: r.relationId,
                                  relationType: r.relationType,
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              data-testid={`kg-relation-delete-${r.relationId}`}
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void onDeleteRelation(r.relationId)
                              }
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <SystemDialog {...dialogProps} />
    </section>
  );
}
