import React from "react";

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
export function KnowledgeGraphPanel(props: {
  projectId: string;
}): JSX.Element {
  const bootstrapStatus = useKgStore((s) => s.bootstrapStatus);
  const entities = useKgStore((s) => s.entities);
  const relations = useKgStore((s) => s.relations);
  const lastError = useKgStore((s) => s.lastError);

  const bootstrapForProject = useKgStore((s) => s.bootstrapForProject);
  const clearError = useKgStore((s) => s.clearError);

  const entityCreate = useKgStore((s) => s.entityCreate);
  const entityUpdate = useKgStore((s) => s.entityUpdate);
  const entityDelete = useKgStore((s) => s.entityDelete);

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
    const ok = window.confirm("Delete this entity? Relations will be removed.");
    if (!ok) {
      return;
    }
    await entityDelete({ entityId });
    if (editing.mode === "entity" && editing.entityId === entityId) {
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
    <section
      data-testid="sidebar-kg"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3)",
          borderBottom: "1px solid var(--color-separator)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Knowledge Graph
        </div>
        <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
          {bootstrapStatus}
        </div>
      </div>

      {lastError ? (
        <div
          role="alert"
          style={{
            padding: "var(--space-3)",
            fontSize: 12,
            color: "var(--color-fg-default)",
            borderBottom: "1px solid var(--color-separator)",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
              data-testid="kg-error-code"
            >
              {lastError.code}
            </div>
            <button
              type="button"
              onClick={clearError}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--color-border-default)",
                borderRadius: 6,
                padding: "2px 8px",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg-default)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ marginTop: 6 }}>{lastError.message}</div>
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <div style={{ padding: "var(--space-3)" }}>
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Entities
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              marginTop: "var(--space-2)",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--color-separator)",
            }}
          >
            <input
              data-testid="kg-entity-name"
              placeholder="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={{
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg-default)",
                fontSize: 12,
              }}
            />
            <input
              placeholder="Type (optional)"
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
              style={{
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg-default)",
                fontSize: 12,
              }}
            />
            <input
              placeholder="Description (optional)"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              style={{
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg-default)",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              data-testid="kg-entity-create"
              onClick={() => void onCreateEntity()}
              disabled={!isReady}
              style={{
                alignSelf: "flex-start",
                fontSize: 12,
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg-default)",
                cursor: !isReady ? "not-allowed" : "pointer",
                opacity: !isReady ? 0.6 : 1,
              }}
            >
              Create entity
            </button>
          </div>

          {entities.length === 0 ? (
            <div
              style={{
                marginTop: "var(--space-3)",
                fontSize: 12,
                color: "var(--color-fg-muted)",
              }}
            >
              No entities yet.
            </div>
          ) : (
            <div
              style={{
                marginTop: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {entities.map((e) => {
                const isEditing =
                  editing.mode === "entity" && editing.entityId === e.entityId;
                return (
                  <div
                    key={e.entityId}
                    data-testid={`kg-entity-row-${e.entityId}`}
                    style={{
                      border: "1px solid var(--color-separator)",
                      borderRadius: 8,
                      padding: 10,
                      background: "var(--color-bg-base)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          value={editing.name}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              name: evt.target.value,
                            })
                          }
                          style={{
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-bg-surface)",
                            color: "var(--color-fg-default)",
                            fontSize: 12,
                          }}
                        />
                        <input
                          value={editing.entityType}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              entityType: evt.target.value,
                            })
                          }
                          style={{
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-bg-surface)",
                            color: "var(--color-fg-default)",
                            fontSize: 12,
                          }}
                        />
                        <input
                          value={editing.description}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              description: evt.target.value,
                            })
                          }
                          style={{
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-bg-surface)",
                            color: "var(--color-fg-default)",
                            fontSize: 12,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12 }}>
                          {entityLabel({ name: e.name, entityType: e.entityType })}
                        </div>
                        {e.description ? (
                          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
                            {e.description}
                          </div>
                        ) : null}
                      </>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void onSaveEdit()}
                            style={{
                              border: "1px solid var(--color-border-default)",
                              borderRadius: 6,
                              padding: "2px 8px",
                              background: "var(--color-bg-surface)",
                              color: "var(--color-fg-default)",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ mode: "idle" })}
                            style={{
                              border: "1px solid var(--color-border-default)",
                              borderRadius: 6,
                              padding: "2px 8px",
                              background: "transparent",
                              color: "var(--color-fg-muted)",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                mode: "entity",
                                entityId: e.entityId,
                                name: e.name,
                                entityType: e.entityType ?? "",
                                description: e.description ?? "",
                              })
                            }
                            style={{
                              border: "1px solid var(--color-border-default)",
                              borderRadius: 6,
                              padding: "2px 8px",
                              background: "transparent",
                              color: "var(--color-fg-muted)",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`kg-entity-delete-${e.entityId}`}
                            onClick={() => void onDeleteEntity(e.entityId)}
                            style={{
                              border: "1px solid var(--color-border-default)",
                              borderRadius: 6,
                              padding: "2px 8px",
                              background: "transparent",
                              color: "var(--color-fg-muted)",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: "var(--space-4)" }}>
            <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
              Relations
            </div>

            <div
              style={{
                marginTop: "var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--color-separator)",
              }}
            >
              <select
                value={relFromId}
                onChange={(e) => setRelFromId(e.target.value)}
                disabled={!isReady || entities.length === 0}
                style={{
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-fg-default)",
                  fontSize: 12,
                }}
              >
                {entities.map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {entityLabel({ name: e.name, entityType: e.entityType })}
                  </option>
                ))}
              </select>

              <select
                value={relToId}
                onChange={(e) => setRelToId(e.target.value)}
                disabled={!isReady || entities.length === 0}
                style={{
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-fg-default)",
                  fontSize: 12,
                }}
              >
                {entities.map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {entityLabel({ name: e.name, entityType: e.entityType })}
                  </option>
                ))}
              </select>

              <input
                data-testid="kg-relation-type"
                placeholder="Relation type (e.g. knows)"
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                disabled={!isReady}
                style={{
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-fg-default)",
                  fontSize: 12,
                }}
              />

              <button
                type="button"
                data-testid="kg-relation-create"
                onClick={() => void onCreateRelation()}
                disabled={!isReady}
                style={{
                  alignSelf: "flex-start",
                  fontSize: 12,
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-fg-default)",
                  cursor: !isReady ? "not-allowed" : "pointer",
                  opacity: !isReady ? 0.6 : 1,
                }}
              >
                Create relation
              </button>
            </div>

            {relations.length === 0 ? (
              <div
                style={{
                  marginTop: "var(--space-3)",
                  fontSize: 12,
                  color: "var(--color-fg-muted)",
                }}
              >
                No relations yet.
              </div>
            ) : (
              <div
                style={{
                  marginTop: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                {relations.map((r) => {
                  const isEditing =
                    editing.mode === "relation" && editing.relationId === r.relationId;
                  return (
                    <div
                      key={r.relationId}
                      data-testid={`kg-relation-row-${r.relationId}`}
                      style={{
                        border: "1px solid var(--color-separator)",
                        borderRadius: 8,
                        padding: 10,
                        background: "var(--color-bg-base)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {isEditing ? (
                        <input
                          value={editing.relationType}
                          onChange={(evt) =>
                            setEditing({
                              ...editing,
                              relationType: evt.target.value,
                            })
                          }
                          style={{
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-bg-surface)",
                            color: "var(--color-fg-default)",
                            fontSize: 12,
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 12 }}>
                          {getEntityName(r.fromEntityId)} -({r.relationType})→{" "}
                          {getEntityName(r.toEntityId)}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8 }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void onSaveEdit()}
                              style={{
                                border: "1px solid var(--color-border-default)",
                                borderRadius: 6,
                                padding: "2px 8px",
                                background: "var(--color-bg-surface)",
                                color: "var(--color-fg-default)",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing({ mode: "idle" })}
                              style={{
                                border: "1px solid var(--color-border-default)",
                                borderRadius: 6,
                                padding: "2px 8px",
                                background: "transparent",
                                color: "var(--color-fg-muted)",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({
                                  mode: "relation",
                                  relationId: r.relationId,
                                  relationType: r.relationType,
                                })
                              }
                              style={{
                                border: "1px solid var(--color-border-default)",
                                borderRadius: 6,
                                padding: "2px 8px",
                                background: "transparent",
                                color: "var(--color-fg-muted)",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void relationDelete({ relationId: r.relationId })
                              }
                              style={{
                                border: "1px solid var(--color-border-default)",
                                borderRadius: 6,
                                padding: "2px 8px",
                                background: "transparent",
                                color: "var(--color-fg-muted)",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
