import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import {
  KnowledgeGraphCanvas,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type KnowledgeGraphNodeType,
} from "@/features/workbench/components/KnowledgeGraphCanvas";

type KnowledgeGraphPanelStatus = "ready" | "loading" | "error";

export interface KnowledgeGraphPanelProps {
  edges: KnowledgeGraphEdge[];
  errorMessage?: string | null;
  nodes: KnowledgeGraphNode[];
  onRetry?: () => void;
  onSelectNode?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  status?: KnowledgeGraphPanelStatus;
}

const NODE_TYPE_ORDER: KnowledgeGraphNodeType[] = [
  "character",
  "location",
  "event",
  "item",
  "faction",
  "other",
];

const NODE_TYPE_COLORS: Record<KnowledgeGraphNodeType, string> = {
  character: "var(--color-node-character, #3f72c8)",
  event: "var(--color-node-event, #ca8a04)",
  faction: "var(--color-node-faction, #6d28d9)",
  item: "var(--color-node-item, #0d9488)",
  location: "var(--color-node-location, #b45309)",
  other: "var(--color-node-other, #4b5563)",
};

function createInitialTypeFilterState(): Record<KnowledgeGraphNodeType, boolean> {
  return {
    character: true,
    event: true,
    faction: true,
    item: true,
    location: true,
    other: true,
  };
}

export function KnowledgeGraphPanel(props: KnowledgeGraphPanelProps) {
  const { t } = useTranslation();
  const {
    edges,
    errorMessage,
    nodes,
    onRetry,
    onSelectNode,
    selectedNodeId: controlledSelectedNodeId,
    status: statusProp,
  } = props;
  const status = statusProp ?? "ready";
  const [activeTypeFilters, setActiveTypeFilters] = useState<Record<KnowledgeGraphNodeType, boolean>>(
    createInitialTypeFilterState,
  );
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(controlledSelectedNodeId ?? null);

  const selectedNodeId = controlledSelectedNodeId ?? internalSelectedNodeId;
  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of nodes) {
      if (activeTypeFilters[node.type]) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [activeTypeFilters, nodes]);

  const filteredNodes = useMemo(
    () => nodes.filter((node) => activeTypeFilters[node.type]),
    [activeTypeFilters, nodes],
  );
  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (edge) => activeNodeIds.has(edge.sourceId) && activeNodeIds.has(edge.targetId),
      ),
    [activeNodeIds, edges],
  );

  const selectedNode = useMemo(
    () => filteredNodes.find((node) => node.id === selectedNodeId) ?? null,
    [filteredNodes, selectedNodeId],
  );

  useEffect(() => {
    if (selectedNodeId === null) {
      return;
    }
    if (activeNodeIds.has(selectedNodeId)) {
      return;
    }
    setInternalSelectedNodeId(null);
    onSelectNode?.(null);
  }, [activeNodeIds, onSelectNode, selectedNodeId]);

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      if (controlledSelectedNodeId === undefined) {
        setInternalSelectedNodeId(nodeId);
      }
      onSelectNode?.(nodeId);
    },
    [controlledSelectedNodeId, onSelectNode],
  );

  const handleTypeToggle = useCallback((type: KnowledgeGraphNodeType) => {
    setActiveTypeFilters((currentState) => ({
      ...currentState,
      [type]: !currentState[type],
    }));
  }, []);

  const restoreAllFilters = useCallback(() => {
    setActiveTypeFilters(createInitialTypeFilterState());
  }, []);

  const selectedNodeRelationCount = useMemo(() => {
    if (selectedNode === null) {
      return 0;
    }
    return filteredEdges.filter(
      (edge) =>
        edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id,
    ).length;
  }, [filteredEdges, selectedNode]);

  const selectedNodeAttributes = useMemo(() => {
    if (selectedNode === null || selectedNode.attributes === undefined) {
      return [];
    }
    return Object.entries(selectedNode.attributes);
  }, [selectedNode]);

  const resolveNodeTypeLabel = useCallback(
    (type: KnowledgeGraphNodeType) => t(`sidebar.knowledgeGraph.type.${type}`),
    [t],
  );

  return (
    <section
      aria-label={t("sidebar.knowledgeGraph.title")}
      className="sidebar-surface"
      style={{
        gap: "var(--space-3)",
      }}
    >
      <header className="panel-section">
        <div>
          <h1 className="screen-title">{t("sidebar.knowledgeGraph.title")}</h1>
          <p className="panel-subtitle">{t("sidebar.knowledgeGraph.subtitle")}</p>
        </div>
      </header>

      {status === "loading" ? (
        <p className="panel-meta" role="status">
          {t("bootstrap.loading")}
        </p>
      ) : null}

      {status === "error" ? (
        <>
          <p className="panel-error" data-testid="knowledge-graph-error" role="alert">
            {errorMessage ?? t("errors.generic")}
          </p>
          {onRetry ? (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <Button tone="ghost" onClick={onRetry}>
                {t("actions.retry")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {status === "ready" ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
            }}
          >
            {NODE_TYPE_ORDER.map((type) => (
              <Button
                key={type}
                aria-pressed={activeTypeFilters[type]}
                className={activeTypeFilters[type] ? "sidebar-item sidebar-item--active" : "sidebar-item"}
                tone="ghost"
                onClick={() => {
                  handleTypeToggle(type);
                }}
              >
                <span
                  aria-hidden
                  style={{
                    background: NODE_TYPE_COLORS[type],
                    borderRadius: "999px",
                    display: "inline-block",
                    height: "8px",
                    marginRight: "8px",
                    width: "8px",
                  }}
                />
                {resolveNodeTypeLabel(type)}
              </Button>
            ))}
          </div>

          <p className="panel-meta">{t("sidebar.knowledgeGraph.meta.total", { count: filteredNodes.length })}</p>

          {filteredNodes.length === 0 ? (
            <div
              style={{
                alignItems: "flex-start",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <p className="panel-meta">
                {nodes.length === 0 ? t("sidebar.knowledgeGraph.state") : t("sidebar.knowledgeGraph.filter.empty")}
              </p>
              {nodes.length > 0 ? (
                <Button tone="ghost" onClick={restoreAllFilters}>
                  {t("sidebar.knowledgeGraph.filter.reset")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "var(--space-3)",
                gridTemplateColumns: "minmax(0, 1fr) 220px",
                minHeight: "0",
              }}
            >
              <KnowledgeGraphCanvas
                edges={filteredEdges}
                nodeColorMap={NODE_TYPE_COLORS}
                nodes={filteredNodes}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
              />

              <aside
                aria-label={t("sidebar.knowledgeGraph.detail.title")}
                style={{
                  background: "var(--color-bg-panel)",
                  border: "1px solid var(--color-separator)",
                  borderRadius: "var(--radius-lg)",
                  minHeight: "0",
                  overflowY: "auto",
                  padding: "var(--space-3)",
                }}
              >
                {selectedNode === null ? (
                  <p className="panel-meta">{t("sidebar.knowledgeGraph.selectNodeHint")}</p>
                ) : (
                  <div style={{ display: "grid", gap: "var(--space-3)" }}>
                    <div>
                      <h3
                        style={{
                          fontFamily: "var(--font-family-ui)",
                          fontSize: "var(--text-body-size)",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          margin: 0,
                        }}
                      >
                        {selectedNode.name}
                      </h3>
                      <p className="panel-meta" style={{ marginTop: "var(--space-1)" }}>
                        {resolveNodeTypeLabel(selectedNode.type)}
                      </p>
                    </div>

                    <dl className="details-grid">
                      <div className="details-row">
                        <dt>{t("sidebar.knowledgeGraph.detail.typeLabel")}</dt>
                        <dd>{resolveNodeTypeLabel(selectedNode.type)}</dd>
                      </div>
                      <div className="details-row">
                        <dt>{t("sidebar.knowledgeGraph.detail.relationCountLabel")}</dt>
                        <dd>{selectedNodeRelationCount}</dd>
                      </div>
                    </dl>

                    <div>
                      <p
                        style={{
                          color: "var(--color-fg-muted)",
                          fontFamily: "var(--font-family-ui)",
                          fontSize: "var(--text-status-size)",
                          margin: 0,
                        }}
                      >
                        {t("sidebar.knowledgeGraph.detail.descriptionLabel")}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-body-size)",
                          lineHeight: "var(--text-body-line-height)",
                          marginBottom: 0,
                          marginTop: "var(--space-1)",
                        }}
                      >
                        {selectedNode.description?.trim()
                          ? selectedNode.description
                          : t("sidebar.knowledgeGraph.detail.emptyDescription")}
                      </p>
                    </div>

                    {selectedNodeAttributes.length > 0 ? (
                      <dl className="details-grid">
                        {selectedNodeAttributes.map(([key, value]) => (
                          <div className="details-row" key={key}>
                            <dt>{key}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="panel-meta">{t("sidebar.knowledgeGraph.detail.noAttributes")}</p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
