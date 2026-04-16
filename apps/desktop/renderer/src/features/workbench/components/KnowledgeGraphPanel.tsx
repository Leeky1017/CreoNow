import { Info, Network, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type KnowledgeGraphPanelStatus = "loading" | "ready" | "error";
export type KnowledgeGraphPanelView = "graph" | "summary";
export type KnowledgeGraphNodeType =
  | "character"
  | "location"
  | "event"
  | "item"
  | "faction";

export interface KnowledgeGraphNode {
  description: string;
  id: string;
  name: string;
  type: KnowledgeGraphNodeType;
  updatedAt: number;
}

export interface KnowledgeGraphLink {
  id: string;
  label?: string;
  sourceId: string;
  targetId: string;
}

interface KnowledgeGraphPanelProps {
  errorMessage: string | null;
  links: KnowledgeGraphLink[];
  nodes: KnowledgeGraphNode[];
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  onViewChange: (view: KnowledgeGraphPanelView) => void;
  query: string;
  status: KnowledgeGraphPanelStatus;
  view: KnowledgeGraphPanelView;
}

const GRAPH_VIEWBOX = {
  width: 360,
  height: 248,
};
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;
const SCALE_STEP = 0.2;

function clampScale(nextValue: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextValue));
}

function toTestIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function nodeColorClass(type: KnowledgeGraphNodeType): string {
  if (type === "character") {
    return "knowledge-graph-node--character";
  }
  return "knowledge-graph-node--location";
}

function typeLabel(type: KnowledgeGraphNodeType, t: (key: string) => string): string {
  if (type === "character") {
    return t("sidebar.knowledgeGraph.type.character");
  }
  if (type === "event") {
    return t("sidebar.knowledgeGraph.type.event");
  }
  if (type === "item") {
    return t("sidebar.knowledgeGraph.type.item");
  }
  if (type === "faction") {
    return t("sidebar.knowledgeGraph.type.faction");
  }
  return t("sidebar.knowledgeGraph.type.location");
}

export function KnowledgeGraphPanel(props: KnowledgeGraphPanelProps) {
  const { t, i18n } = useTranslation();
  const [scale, setScale] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const normalizedQuery = props.query.trim().toLocaleLowerCase();
  const filteredNodes = useMemo(
    () =>
      props.nodes.filter((node) => {
        if (normalizedQuery.length === 0) {
          return true;
        }
        return [node.name, node.description].join(" ").toLocaleLowerCase().includes(normalizedQuery);
      }),
    [normalizedQuery, props.nodes],
  );

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredLinks = useMemo(
    () => props.links.filter((link) => filteredNodeIds.has(link.sourceId) && filteredNodeIds.has(link.targetId)),
    [filteredNodeIds, props.links],
  );

  const characterCount = filteredNodes.filter((node) => node.type === "character").length;
  const locationCount = filteredNodes.filter((node) => node.type === "location").length;
  const selectedNode = filteredNodes.find((node) => node.id === selectedNodeId) ?? null;

  const layoutNodes = useMemo(() => {
    const centerX = GRAPH_VIEWBOX.width / 2;
    const centerY = GRAPH_VIEWBOX.height / 2;
    if (filteredNodes.length === 0) {
      return [];
    }
    if (filteredNodes.length === 1) {
      return [{ ...filteredNodes[0], x: centerX, y: centerY }];
    }

    const radius = Math.max(64, Math.min(104, 54 + filteredNodes.length * 4));
    return filteredNodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / filteredNodes.length - Math.PI / 2;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }, [filteredNodes]);

  const nodeById = useMemo(
    () => new Map(layoutNodes.map((node) => [node.id, node])),
    [layoutNodes],
  );

  const summaryNodes = useMemo(
    () => [...filteredNodes].sort((left, right) => right.updatedAt - left.updatedAt),
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

  return (
    <div className="knowledge-graph-panel" data-testid="knowledge-graph-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.knowledgeGraph.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.knowledgeGraph.subtitle")}</p>
      </div>

      <div className="knowledge-graph-panel__toolbar">
        <label className="knowledge-graph-panel__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t("sidebar.knowledgeGraph.searchPlaceholder")}
            aria-label={t("sidebar.knowledgeGraph.searchLabel")}
            data-testid="knowledge-graph-search"
          />
        </label>
        <div className="knowledge-graph-panel__view-switch" role="group" aria-label={t("sidebar.knowledgeGraph.viewLabel")}>
          <button
            type="button"
            aria-pressed={props.view === "graph"}
            className={props.view === "graph" ? "knowledge-graph-panel__view-tab is-active" : "knowledge-graph-panel__view-tab"}
            onClick={() => props.onViewChange("graph")}
            data-testid="knowledge-graph-view-graph"
          >
            {t("sidebar.knowledgeGraph.view.graph")}
          </button>
          <button
            type="button"
            aria-pressed={props.view === "summary"}
            className={props.view === "summary" ? "knowledge-graph-panel__view-tab is-active" : "knowledge-graph-panel__view-tab"}
            onClick={() => props.onViewChange("summary")}
            data-testid="knowledge-graph-view-summary"
          >
            {t("sidebar.knowledgeGraph.view.summary")}
          </button>
        </div>
      </div>

      {props.status === "ready" ? (
        <div className="knowledge-graph-panel__meta" data-testid="knowledge-graph-meta">
          <span>{t("sidebar.knowledgeGraph.meta.total", { count: filteredNodes.length })}</span>
          <span>{t("sidebar.knowledgeGraph.meta.characters", { count: characterCount })}</span>
          <span>{t("sidebar.knowledgeGraph.meta.locations", { count: locationCount })}</span>
        </div>
      ) : null}

      {props.status === "loading" ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-loading">
          {t("sidebar.knowledgeGraph.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="knowledge-graph-panel__state knowledge-graph-panel__state--error" data-testid="knowledge-graph-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" && props.nodes.length === 0 ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-empty">
          <p>{t("sidebar.knowledgeGraph.empty.title")}</p>
          <p>{t("sidebar.knowledgeGraph.empty.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && props.nodes.length > 0 && filteredNodes.length === 0 ? (
        <div className="knowledge-graph-panel__state" data-testid="knowledge-graph-no-match">
          <p>{t("sidebar.knowledgeGraph.noMatch.title")}</p>
          <p>{t("sidebar.knowledgeGraph.noMatch.desc")}</p>
        </div>
      ) : null}

      {props.status === "ready" && filteredNodes.length > 0 && props.view === "graph" ? (
        <div className="knowledge-graph-panel__graph-layout">
          <section className="knowledge-graph-panel__canvas-shell">
            <div className="knowledge-graph-panel__canvas-controls">
              <Button
                tone="ghost"
                onClick={() => setScale((current) => clampScale(current + SCALE_STEP))}
                aria-label={t("sidebar.knowledgeGraph.zoomIn")}
              >
                <ZoomIn size={14} />
              </Button>
              <Button
                tone="ghost"
                onClick={() => setScale((current) => clampScale(current - SCALE_STEP))}
                aria-label={t("sidebar.knowledgeGraph.zoomOut")}
              >
                <ZoomOut size={14} />
              </Button>
              <Button
                tone="ghost"
                onClick={() => setScale(1)}
                aria-label={t("sidebar.knowledgeGraph.resetZoom")}
              >
                <RotateCcw size={14} />
              </Button>
            </div>
            <svg
              className="knowledge-graph-panel__canvas"
              viewBox={`0 0 ${GRAPH_VIEWBOX.width} ${GRAPH_VIEWBOX.height}`}
              data-testid="knowledge-graph-svg"
            >
              <g
                transform={`translate(${GRAPH_VIEWBOX.width / 2} ${GRAPH_VIEWBOX.height / 2}) scale(${scale}) translate(${-GRAPH_VIEWBOX.width / 2} ${-GRAPH_VIEWBOX.height / 2})`}
              >
                {filteredLinks.map((link) => {
                  const sourceNode = nodeById.get(link.sourceId);
                  const targetNode = nodeById.get(link.targetId);
                  if (!sourceNode || !targetNode) {
                    return null;
                  }
                  return (
                    <g key={link.id} className="knowledge-graph-link">
                      <line x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y} />
                      {link.label ? (
                        <text x={(sourceNode.x + targetNode.x) / 2} y={(sourceNode.y + targetNode.y) / 2 - 6}>
                          {link.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {layoutNodes.map((node) => (
                  <g
                    key={node.id}
                    className={selectedNodeId === node.id ? "knowledge-graph-node is-selected" : "knowledge-graph-node"}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    role="button"
                    tabIndex={0}
                    data-testid={`knowledge-graph-node-${toTestIdSuffix(node.id)}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedNodeId(node.id);
                      }
                    }}
                  >
                    <circle r={selectedNodeId === node.id ? 15 : 12} className={nodeColorClass(node.type)} />
                    <text y={26}>{node.name}</text>
                  </g>
                ))}
              </g>
            </svg>
          </section>

          <section className="knowledge-graph-panel__detail" data-testid="knowledge-graph-detail">
            <div className="knowledge-graph-panel__detail-label">
              <Info size={14} aria-hidden="true" />
              <span>{t("sidebar.knowledgeGraph.detail.title")}</span>
            </div>
            {selectedNode ? (
              <div className="knowledge-graph-panel__detail-body">
                <h3 className="knowledge-graph-panel__detail-name">{selectedNode.name}</h3>
                <p className="knowledge-graph-panel__detail-type">{typeLabel(selectedNode.type, t)}</p>
                <p className="knowledge-graph-panel__detail-description">
                  {selectedNode.description.trim().length > 0
                    ? selectedNode.description
                    : t("sidebar.knowledgeGraph.detail.emptyDescription")}
                </p>
                <p className="knowledge-graph-panel__detail-relations">
                  {filteredLinks.length > 0
                    ? t("sidebar.knowledgeGraph.detail.relationCount", { count: filteredLinks.filter((link) => link.sourceId === selectedNode.id || link.targetId === selectedNode.id).length })
                    : t("sidebar.knowledgeGraph.relationPlaceholder")}
                </p>
              </div>
            ) : (
              <div className="knowledge-graph-panel__detail-empty">
                <Network size={16} aria-hidden="true" />
                <p>{t("sidebar.knowledgeGraph.selectNodeHint")}</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {props.status === "ready" && filteredNodes.length > 0 && props.view === "summary" ? (
        <section className="knowledge-graph-panel__summary-list" data-testid="knowledge-graph-summary-list">
          {summaryNodes.map((node) => (
            <article key={node.id} className="knowledge-graph-summary-card" data-testid={`knowledge-graph-summary-${toTestIdSuffix(node.id)}`}>
              <header className="knowledge-graph-summary-card__header">
                <h3 className="knowledge-graph-summary-card__title">{node.name}</h3>
                <span className={nodeColorClass(node.type)}>{typeLabel(node.type, t)}</span>
              </header>
              <p className="knowledge-graph-summary-card__description">
                {node.description.trim().length > 0
                  ? node.description
                  : t("sidebar.knowledgeGraph.detail.emptyDescription")}
              </p>
              <p className="knowledge-graph-summary-card__meta">
                {t("sidebar.knowledgeGraph.summary.updatedAt", {
                  timestamp: summaryTimestampFormatter.format(node.updatedAt),
                })}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
