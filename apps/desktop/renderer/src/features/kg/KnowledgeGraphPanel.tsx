import React from "react";

import { Button, Card, Input, Select, Text } from "../../components/primitives";
import { SystemDialog } from "../../components/features/AiDialogs/SystemDialog";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useKgStore } from "../../stores/kgStore";

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

function entityLabel(args: { name: string; entityType?: string }): string {
  return args.entityType ? `${args.name} (${args.entityType})` : args.name;
}

/**
 * KnowledgeGraphPanel renders the minimal KG CRUD surface.
 *
 * Why: P0 requires KG discoverability (sidebar entry), CRUD, and predictable
 * data for context injection.
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

  return (
    <section data-testid="sidebar-kg" className="flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)]">
        <Text size="small" color="muted">
          Knowledge Graph
        </Text>
        <Text size="tiny" color="muted">
          {bootstrapStatus}
        </Text>
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
