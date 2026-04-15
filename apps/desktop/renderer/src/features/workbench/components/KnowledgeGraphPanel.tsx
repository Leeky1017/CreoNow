import { Info, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import {
  KnowledgeGraphCanvas,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type KnowledgeGraphNodeType,
} from "@/features/workbench/components/KnowledgeGraphCanvas";

export type KnowledgeGraphPanelStatus = "ready" | "loading" | "error";
export type KnowledgeGraphPanelView = "graph" | "summary";

export interface KnowledgeGraphPanelProps {
  edges: KnowledgeGraphEdge[];
  errorMessage?: string | null;
  nodes: KnowledgeGraphNode[];
  onQueryChange?: (value: string) => void;
  onRetry?: () => void;
  onSelectNode?: (nodeId: string | null) => void;
  onViewChange?: (view: KnowledgeGraphPanelView) => void;
  query?: string;
  selectedNodeId?: string | null;
  status?: KnowledgeGraphPanelStatus;
  view?: KnowledgeGraphPanelView;
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

function toTestIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function KnowledgeGraphPanel(props: KnowledgeGraphPanelProps) {
  const { t, i18n } = useTranslation();
  const {
    edges,
    errorMessage,
    nodes,
    onQueryChange,
    onRetry,
    onSelectNode,
    onViewChange,
    query: controlledQuery,
    selectedNodeId: controlledSelectedNodeId,
    status: statusProp,
    view: controlledView,
  } = props;
  const status = statusProp ?? "ready";

  const [internalQuery, setInternalQuery] = useState("");
  const [internalView, setInternalView] = useState<KnowledgeGraphPanelView>("graph");
  const [activeTypeFilters, setActiveTypeFilters] = useState<Record<KnowledgeGraphNodeType, boolean>>(
    createInitialTypeFilterState,
  );
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(
    controlledSelectedNodeId ?? null,
  );

  const query = controlledQuery ?? internalQuery;
  const view = controlledView ?? internalView;
  const selectedNodeId = controlledSelectedNodeId ?? internalSelectedNodeId;
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filteredNodesByQuery = useMemo(
    () =>
      nodes.filter((node) => {
        if (normalizedQuery.length === 0) {
          return true;
        }
        return [node.name, node.description ?? "", node.id]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      }),
    [nodes, normalizedQuery],
  );

  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of filteredNodesByQuery) {
      if (activeTypeFilters[node.type]) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [activeTypeFilters, filteredNodesByQuery]);

  const filteredNodes = useMemo(
    () => filteredNodesByQuery.filter((node) => activeTypeFilters[node.type]),
    [activeTypeFilters, filteredNodesByQuery],
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
    if (selectedNode?.attributes === undefined) {
      return [];
    }
    return Object.entries(selectedNode.attributes);
  }, [selectedNode]);
  const characterCount = filteredNodes.filter((node) => node.type === "character").length;
  const locationCount = filteredNodes.filter((node) => node.type === "location").length;
  const summaryNodes = useMemo(
    () => [...filteredNodes].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)),
    [filteredNodes],
  );
  const summaryTimestampFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage ?? undefined, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
      }),
    [i18n.resolvedLanguage],
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

  const resolveNodeTypeLabel = useCallback(
    (type: KnowledgeGraphNodeType) => t(`sidebar.knowledgeGraph.type.${type}`),
    [t],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      if (controlledQuery === undefined) {
        setInternalQuery(value);
      }
      onQueryChange?.(value);
    },
    [controlledQuery, onQueryChange],
  );

  const handleViewChange = useCallback(
    (nextView: KnowledgeGraphPanelView) => {
      if (controlledView === undefined) {
        setInternalView(nextView);
      }
      onViewChange?.(nextView);
    },
    [controlledView, onViewChange],
  );

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

  return (
    <section
      aria-label={t("sidebar.knowledgeGraph.title")}
      className="sidebar-surface knowledge-graph-panel"
      data-testid="knowledge-graph-panel"
      style={{
        gap: "var(--space-3)",
      }}
    >
      <header className="panel-section">
        <h1 className="screen-title">{t("sidebar.knowledgeGraph.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.knowledgeGraph.subtitle")}</p>
      </header>

      <div className="knowledge-graph-panel__toolbar">
        <label className="knowledge-graph-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder={t("sidebar.knowledgeGraph.searchPlaceholder")}
            aria-label={t("sidebar.knowledgeGraph.searchLabel")}
            data-testid="knowledge-graph-search"
          />
        </label>
        <div className="knowledge-graph-panel__view-switch" role="group" aria-label={t("sidebar.knowledgeGraph.viewLabel")}>
          <button
            type="button"
            aria-pressed={view === "graph"}
            className={view === "graph" ? "knowledge-graph-panel__view-tab is-active" : "knowledge-graph-panel__view-tab"}
            onClick={() => handleViewChange("graph")}
            data-testid="knowledge-graph-view-graph"
          >
            {t("sidebar.knowledgeGraph.view.graph")}
          </button>
          <button
            type="button"
            aria-pressed={view === "summary"}
            className={view === "summary" ? "knowledge-graph-panel__view-tab is-active" : "knowledge-graph-panel__view-tab"}
            onClick={() => handleViewChange("summary")}
            data-testid="knowledge-graph-view-summary"
          >
            {t("sidebar.knowledgeGraph.view.summary")}
          </button>
        </div>
      </div>

      {status === "ready" ? (
        <div className="knowledge-graph-panel__meta" data-testid="knowledge-graph-meta">
          <span>{t("sidebar.knowledgeGraph.meta.total", { count: filteredNodes.length })}</span>
          <span>{t("sidebar.knowledgeGraph.meta.characters", { count: characterCount })}</span>
          <span>{t("sidebar.knowledgeGraph.meta.locations", { count: locationCount })}</span>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-loading">
          {t("sidebar.knowledgeGraph.loading")}
        </div>
      ) : null}

      {status === "error" ? (
        <div
          className="knowledge-graph-panel__state knowledge-graph-panel__state--error"
          data-testid="knowledge-graph-error"
          role="alert"
        >
          <p>{errorMessage ?? t("errors.generic")}</p>
          {onRetry ? <Button tone="secondary" onClick={onRetry}>{t("actions.retry")}</Button> : null}
        </div>
      ) : null}

      {status === "ready" && nodes.length === 0 ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-empty">
          <p>{t("sidebar.knowledgeGraph.state")}</p>
        </div>
      ) : null}

      {status === "ready" && nodes.length > 0 && filteredNodes.length === 0 ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-no-match">
          <p>{t("sidebar.knowledgeGraph.noMatch.title")}</p>
          <p>{t("sidebar.knowledgeGraph.noMatch.desc")}</p>
        </div>
      ) : null}

      {status === "ready" && nodes.length > 0 && view === "graph" ? (
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
                {t("sidebar.knowledgeGraph.filter.empty")}
              </p>
              <Button tone="ghost" onClick={restoreAllFilters}>
                {t("sidebar.knowledgeGraph.filter.reset")}
              </Button>
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
                <div className="knowledge-graph-panel__detail-label">
                  <Info size={14} aria-hidden="true" />
                  <span>{t("sidebar.knowledgeGraph.detail.title")}</span>
                </div>
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

      {status === "ready" && filteredNodes.length > 0 && view === "summary" ? (
        <section className="knowledge-graph-panel__summary-list" data-testid="knowledge-graph-summary-list">
          {summaryNodes.map((node) => (
            <article key={node.id} className="knowledge-graph-summary-card" data-testid={`knowledge-graph-summary-${toTestIdSuffix(node.id)}`}>
              <header className="knowledge-graph-summary-card__header">
                <h3 className="knowledge-graph-summary-card__title">{node.name}</h3>
                <span>{resolveNodeTypeLabel(node.type)}</span>
              </header>
              <p className="knowledge-graph-summary-card__description">
                {node.description?.trim().length
                  ? node.description
                  : t("sidebar.knowledgeGraph.detail.emptyDescription")}
              </p>
              <p className="knowledge-graph-summary-card__meta">
                {t("sidebar.knowledgeGraph.summary.updatedAt", {
                  timestamp: summaryTimestampFormatter.format(node.updatedAt ?? 0),
                })}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}
