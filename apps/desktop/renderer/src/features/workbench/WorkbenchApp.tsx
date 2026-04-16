import {
  Bold,
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Files,
  Globe,
  Layers,
  LayoutDashboard,
  Maximize2,
  MessageSquare,
  Minimize2,
  Network,
  Search,
  Settings,
  Type,
  Users,
  Italic,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import type { IpcError, IpcResponseData } from "@shared/types/ipc-generated";

import { Button } from "@/components/primitives/Button";
import {
  createEditorBridge,
  type SelectionViewportAnchor,
} from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";
import type { VersionHistorySnapshotDetail } from "@/features/version-history/types";
import { useVersionHistoryController } from "@/features/version-history/useVersionHistoryController";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";
import {
  CalendarPanel,
  type CalendarEvent,
  type CalendarMilestone,
  type CalendarPanelStatus,
} from "@/features/workbench/components/CalendarPanel";
import { CommandPalette, type CommandPaletteItem } from "@/features/workbench/components/CommandPalette";
import { EditorSelectionToolbar } from "@/features/workbench/components/EditorSelectionToolbar";
import {
  ExportPublishModal,
  type ExportFormat,
  type ExportPublishMode,
} from "@/features/workbench/components/ExportPublishModal";
import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";
import {
  KnowledgeGraphPanel,
  type KnowledgeGraphPanelView,
} from "@/features/workbench/components/KnowledgeGraphPanel";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from "@/features/workbench/components/KnowledgeGraphCanvas";
import {
  MemoryPanel,
  type MemoryPanelEntry,
  type MemoryPanelStatus,
} from "@/features/workbench/components/MemoryPanel";
import {
  SearchPanel,
  type SearchPanelResult,
  type SearchPanelStatus,
  type SearchStrategy,
} from "@/features/workbench/components/SearchPanel";
import {
  ScenariosPanel,
  type ScenarioTemplate,
  type ScenariosPanelStatus,
} from "@/features/workbench/components/ScenariosPanel";
import {
  WorldbuildingPanel,
  type WorldbuildingEntry,
  type WorldbuildingEntryStatus,
  type WorldbuildingPanelStatus,
  type WorldbuildingTab,
} from "@/features/workbench/components/WorldbuildingPanel";
import {
  bootstrapWorkspace,
  createDocumentAndOpen,
  openDocument,
  type AiPreview,
  type DocumentListItem,
  type DocumentRead,
  type ProjectListItem,
  type WorkbenchContextToken,
} from "@/features/workbench/runtime";
import { AppToastProvider, useAppToast } from "@/lib/appToast";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import { GlobalErrorToastBridge } from "@/lib/globalErrorToastBridge";
import { getPreloadApi, type PreloadApi } from "@/lib/preloadApi";
import { useExportProgress } from "@/lib/useExportProgress";

import {
  BlockedAutosaveError,
  useAutosaveController,
  useAiSkillController,
  usePanelLayout,
  LEFT_SIDEBAR_BOUNDS,
  RIGHT_PANEL_BOUNDS,
  RIGHT_PANEL_IDS,
  type AutosaveToastEvent,
  type LeftPanelId,
} from "./hooks";

const MAX_REFERENCE_LENGTH = 120;
const KNOWLEDGE_GRAPH_ENTITY_PAGE_SIZE = 500;
const KNOWLEDGE_GRAPH_RELATION_PAGE_SIZE = 1000;
const KNOWLEDGE_GRAPH_MAX_PAGE_REQUESTS = 12;
const KNOWLEDGE_GRAPH_MAX_ENTITY_ITEMS = 180;
const KNOWLEDGE_GRAPH_MAX_RELATION_ITEMS = 360;
const WELCOME_SCENARIOS_KEY = "creonow:onboarding:welcome-scenarios";
type LocationListItem = IpcResponseData<"settings:location:list">["items"][number];
type CharacterListItem = IpcResponseData<"settings:character:list">["items"][number];
type MemorySimpleListItem = IpcResponseData<"memory:simple:list">["items"][number];
type MemoryEpisodeListItem = IpcResponseData<"memory:episode:query">["items"][number];
type MemorySemanticRuleItem = IpcResponseData<"memory:semantic:list">["items"][number];
type KnowledgeEntityListItem = IpcResponseData<"knowledge:entity:list">["items"][number];
type KnowledgeRelationListItem = IpcResponseData<"knowledge:relation:list">["items"][number];
type WorkbenchKnowledgeGraphNode = KnowledgeGraphNode & { updatedAt: number };
type PagedKnowledgeResponse<TItem> =
  | {
      ok: true;
      data: {
        items: TItem[];
        totalCount: number;
      };
    }
  | {
      ok: false;
      error: IpcError;
    };

type PagedKnowledgeLoadResult<TItem> =
  | {
      ok: true;
      data: {
        items: TItem[];
        totalCount: number;
        truncated: boolean;
      };
    }
  | {
      ok: false;
      error: IpcError;
    };

type BootstrapStatus = "loading" | "ready" | "error";

type VersionPreviewState = {
  currentContentJson: string;
  snapshot: VersionHistorySnapshotDetail;
};

async function loadPagedKnowledgeItems<TItem>(options: {
  isCancelled?: () => boolean;
  maxItems: number;
  pageSize: number;
  queryPage: (offset: number, limit: number) => Promise<PagedKnowledgeResponse<TItem>>;
}): Promise<PagedKnowledgeLoadResult<TItem>> {
  const { isCancelled, maxItems, pageSize, queryPage } = options;
  const collected: TItem[] = [];
  let totalCount = 0;
  let offset = 0;

  for (let pageIndex = 0; pageIndex < KNOWLEDGE_GRAPH_MAX_PAGE_REQUESTS; pageIndex += 1) {
    if (isCancelled?.()) {
      throw new Error("KNOWLEDGE_GRAPH_PAGINATION_CANCELLED");
    }

    const pageResult = await queryPage(offset, pageSize);
    if (isCancelled?.()) {
      throw new Error("KNOWLEDGE_GRAPH_PAGINATION_CANCELLED");
    }

    if (!pageResult.ok) {
      return {
        ok: false,
        error: pageResult.error,
      };
    }

    totalCount = pageResult.data.totalCount;
    const remaining = Math.max(maxItems - collected.length, 0);
    if (remaining > 0) {
      collected.push(...pageResult.data.items.slice(0, remaining));
    }

    offset += pageResult.data.items.length;
    const reachedTotalCount = totalCount > 0 && collected.length >= totalCount;
    const reachedPageEnd = pageResult.data.items.length === 0;
    const reachedLimitCap = collected.length >= maxItems;

    if (reachedTotalCount || reachedPageEnd || reachedLimitCap) {
      break;
    }
  }

  return {
    ok: true,
    data: {
      items: collected,
      totalCount,
      truncated: totalCount > collected.length,
    },
  };
}

/** @why 20px matches golden design source icon size (figma_design/layout.tsx line 150). */
const ICON_SIZE = 20;

const LEFT_PANEL_ITEMS: Array<{
  icon: typeof Files;
  id: LeftPanelId;
  labelKey: string;
  placement: "top" | "bottom";
}> = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "iconBar.dashboard", placement: "top" },
  { id: "search", icon: Search, labelKey: "iconBar.search", placement: "top" },
  { id: "calendar", icon: Calendar, labelKey: "iconBar.calendar", placement: "top" },
  { id: "files", icon: Files, labelKey: "iconBar.files", placement: "top" },
  { id: "outline", icon: Type, labelKey: "iconBar.outline", placement: "top" },
  { id: "versionHistory", icon: BookOpen, labelKey: "iconBar.versionHistory", placement: "top" },
  { id: "scenarios", icon: Layers, labelKey: "iconBar.scenarios", placement: "top" },
  { id: "characters", icon: Users, labelKey: "iconBar.characters", placement: "top" },
  { id: "worldbuilding", icon: Globe, labelKey: "iconBar.worldbuilding", placement: "top" },
  { id: "knowledgeGraph", icon: Network, labelKey: "iconBar.knowledgeGraph", placement: "top" },
  { id: "memory", icon: Brain, labelKey: "iconBar.memory", placement: "top" },
  { id: "settings", icon: Settings, labelKey: "iconBar.settings", placement: "bottom" },
];

const SCENARIO_ITEMS = [
  {
    id: "novel",
    labelKey: "scenario.novel",
    description: "章节级长线叙事与角色冲突主导。",
    profileKey: "sidebar.scenarios.profile.novel",
  },
  {
    id: "diary",
    labelKey: "scenario.diary",
    description: "碎片化记录与情绪流写作。",
    profileKey: "sidebar.scenarios.profile.diary",
  },
  {
    id: "script",
    labelKey: "scenario.script",
    description: "场次切换与对白节奏优先。",
    profileKey: "sidebar.scenarios.profile.script",
  },
  {
    id: "social",
    labelKey: "scenario.social",
    description: "传播导向短文与结构化选题。",
    profileKey: "sidebar.scenarios.profile.social",
  },
] as const;

type ScenarioId = (typeof SCENARIO_ITEMS)[number]["id"];

function isScenarioId(value: string): value is ScenarioId {
  return SCENARIO_ITEMS.some((scenario) => scenario.id === value);
}

const QUICK_TOOL_ITEMS = [
  "sidebar.quickTools.search",
  "sidebar.quickTools.tree",
  "sidebar.quickTools.conflict",
  "sidebar.quickTools.export",
] as const;

function toWorldbuildingStatus(rawStatus: string | undefined, description: string): WorldbuildingEntryStatus {
  const normalized = rawStatus?.trim().toLocaleLowerCase();
  if (normalized === "detailed") {
    return "detailed";
  }
  if (normalized === "draft") {
    return "draft";
  }
  if (normalized === "unknown") {
    return "unknown";
  }
  if (normalized === undefined || normalized.length === 0) {
    return description.trim().length > 0 ? "detailed" : "draft";
  }
  return "unknown";
}

function mapLocationToWorldbuildingEntry(
  location: LocationListItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): WorldbuildingEntry {
  const detailType = location.attributes.type?.trim() || location.attributes.category?.trim();
  const typeLabel = detailType && detailType.length > 0
    ? t("sidebar.worldbuilding.entryType.tagged", { type: detailType })
    : t("sidebar.worldbuilding.entryType.location");
  return {
    description: location.description ?? "",
    id: location.id,
    name: location.name,
    status: toWorldbuildingStatus(location.attributes.status, location.description ?? ""),
    typeLabel,
    updatedAt: location.updatedAt,
  };
}

function mapCharacterToKnowledgeNode(character: CharacterListItem): WorkbenchKnowledgeGraphNode {
  return {
    attributes: character.attributes,
    description: character.description ?? "",
    id: character.id,
    name: character.name,
    type: "character",
    updatedAt: character.updatedAt,
  };
}

function mapLocationToKnowledgeNode(location: LocationListItem): WorkbenchKnowledgeGraphNode {
  return {
    attributes: location.attributes,
    description: location.description ?? "",
    id: location.id,
    name: location.name,
    type: "location",
    updatedAt: location.updatedAt,
  };
}

function parseTimestampToMs(input: string | number | null | undefined): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const parsed = Date.parse(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function mapKnowledgeEntityToNode(entity: KnowledgeEntityListItem): WorkbenchKnowledgeGraphNode {
  return {
    attributes: entity.attributes,
    description: entity.description ?? "",
    id: entity.id,
    name: entity.name,
    type: entity.type,
    updatedAt: parseTimestampToMs(entity.updatedAt),
  };
}

function mapKnowledgeRelationToEdge(relation: KnowledgeRelationListItem): KnowledgeGraphEdge {
  return {
    id: relation.id,
    label: relation.relationType,
    sourceId: relation.sourceEntityId,
    targetId: relation.targetEntityId,
  };
}

function mapMemoryItemToPanelEntry(item: MemorySimpleListItem): MemoryPanelEntry {
  return {
    category: item.category ?? "",
    createdAt: item.createdAt,
    id: item.id,
    key: item.key,
    source: item.source,
    updatedAt: item.updatedAt,
    value: item.value,
  };
}

function mapSemanticRuleToPanelEntry(rule: MemorySemanticRuleItem): MemoryPanelEntry {
  const evidenceSummary = [
    rule.supportingEpisodes.length > 0 ? `+${rule.supportingEpisodes.length}` : "",
    rule.contradictingEpisodes.length > 0 ? `-${rule.contradictingEpisodes.length}` : "",
  ]
    .filter((part) => part.length > 0)
    .join(" / ");
  const confidenceText = `${Math.round(rule.confidence * 100)}%`;

  return {
    category: rule.category,
    createdAt: rule.createdAt,
    id: `semantic:${rule.id}`,
    key: rule.rule,
    source: "system",
    updatedAt: rule.updatedAt,
    value: [confidenceText, evidenceSummary].filter((part) => part.length > 0).join(" · "),
  };
}

function mapEpisodeToPanelEntry(item: MemoryEpisodeListItem): MemoryPanelEntry {
  return {
    category: "episodic",
    createdAt: item.createdAt,
    id: `episode:${item.id}`,
    key: `${item.sceneType} · ${item.skillUsed}`,
    source: "system",
    updatedAt: item.updatedAt,
    value: item.finalText.trim().length > 0 ? item.finalText : item.inputContext,
  };
}

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function isMeaningfulSelection(selection: SelectionRef | null): selection is SelectionRef {
  return selection !== null && selection.text.trim().length > 0;
}

function truncateReference(text: string): string {
  if (text.length <= MAX_REFERENCE_LENGTH) {
    return text;
  }

  return text.slice(0, MAX_REFERENCE_LENGTH).trimEnd() + "...";
}

function formatCreativeDuration(totalMinutes: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return t("status.durationMinutes", { minutes });
  }

  return t("status.durationHours", { hours, minutes });
}

function ToastIntegrationBridge(props: {
  autosaveEvent: AutosaveToastEvent | null;
  retryLastAutosave: () => void;
}) {
  const { showToast } = useAppToast();
  const { t } = useTranslation();
  const latestHandledEventRef = useRef(0);

  useEffect(() => {
    if (props.autosaveEvent === null || props.autosaveEvent.eventId === latestHandledEventRef.current) {
      return;
    }

    latestHandledEventRef.current = props.autosaveEvent.eventId;

    if (props.autosaveEvent.kind === "error") {
      showToast({
        action: {
          label: t("actions.retry"),
          onClick: props.retryLastAutosave,
        },
        description: props.autosaveEvent.errorMessage ?? t("toast.autosaveError.description"),
        title: t("toast.autosaveError.title"),
        variant: "error",
      });
      return;
    }

    showToast({
      description: t("toast.autosaveSuccess.description"),
      title: t("toast.autosaveSuccess.title"),
      variant: "success",
    });
  }, [props.autosaveEvent, props.retryLastAutosave, showToast, t]);

  return null;
}

export function WorkbenchApp() {
  return <AppToastProvider>
    <GlobalErrorToastBridge />
    <WorkbenchShell />
  </AppToastProvider>;
}

function WorkbenchShell() {
  const { t } = useTranslation();
  const api = useMemo(() => getPreloadApi(), []);
  const exportProgress = useExportProgress();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userEditRevisionRef = useRef(0);
  const editorContextRevisionRef = useRef(0);
  const activeContextTokenRef = useRef<WorkbenchContextToken | null>(null);
  const bootstrapStatusRef = useRef<BootstrapStatus>("loading");
  const selectionToolbarPromptOpenRef = useRef(false);

  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("loading");
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRead | null>(null);
  const [liveSelection, setLiveSelection] = useState<SelectionRef | null>(null);
  const [selectionToolbarAnchor, setSelectionToolbarAnchor] =
    useState<SelectionViewportAnchor | null>(null);
  const [selectionToolbarPromptOpen, setSelectionToolbarPromptOpen] = useState(false);
  const [selectionToolbarResetKey, setSelectionToolbarResetKey] = useState<string | null>(null);
  const [stickySelection, setStickySelection] = useState<SelectionRef | null>(null);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [versionPreviewState, setVersionPreviewState] = useState<VersionPreviewState | null>(null);
  const [restoreDialogSnapshot, setRestoreDialogSnapshot] = useState<VersionHistorySnapshotDetail | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>("novel");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState(false);
  const [worldbuildingEntries, setWorldbuildingEntries] = useState<WorldbuildingEntry[]>([]);
  const [worldbuildingStatus, setWorldbuildingStatus] = useState<WorldbuildingPanelStatus>("loading");
  const [worldbuildingErrorMessage, setWorldbuildingErrorMessage] = useState<string | null>(null);
  const [worldbuildingQuery, setWorldbuildingQuery] = useState("");
  const [worldbuildingTab, setWorldbuildingTab] = useState<WorldbuildingTab>("encyclopedia");
  const [worldbuildingReloadToken, setWorldbuildingReloadToken] = useState(0);
  const [knowledgeGraphNodes, setKnowledgeGraphNodes] = useState<WorkbenchKnowledgeGraphNode[]>([]);
  const [knowledgeGraphEdges, setKnowledgeGraphEdges] = useState<KnowledgeGraphEdge[]>([]);
  const [knowledgeGraphStatus, setKnowledgeGraphStatus] = useState<"loading" | "ready" | "error">("loading");
  const [knowledgeGraphErrorMessage, setKnowledgeGraphErrorMessage] = useState<string | null>(null);
  const [knowledgeGraphNoticeMessage, setKnowledgeGraphNoticeMessage] = useState<string | null>(null);
  const [knowledgeGraphQuery, setKnowledgeGraphQuery] = useState("");
  const [knowledgeGraphView, setKnowledgeGraphView] = useState<KnowledgeGraphPanelView>("graph");
  const [knowledgeGraphReloadToken, setKnowledgeGraphReloadToken] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchPanelResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchPanelStatus>("ready");
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [searchEffectiveStrategy, setSearchEffectiveStrategy] = useState<SearchStrategy>("hybrid");
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStrategy, setSearchStrategy] = useState<SearchStrategy>("hybrid");
  const [searchReloadToken, setSearchReloadToken] = useState(0);
  const [memoryEntries, setMemoryEntries] = useState<MemoryPanelEntry[]>([]);
  const [memoryStatus, setMemoryStatus] = useState<MemoryPanelStatus>("loading");
  const [memoryErrorMessage, setMemoryErrorMessage] = useState<string | null>(null);
  const [memoryQuery, setMemoryQuery] = useState("");
  const [memoryReloadToken, setMemoryReloadToken] = useState(0);
  const [scenariosStatus, setScenariosStatus] = useState<ScenariosPanelStatus>("ready");
  const [scenariosErrorMessage, setScenariosErrorMessage] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarPanelStatus>("ready");
  const [calendarErrorMessage, setCalendarErrorMessage] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalMode, setExportModalMode] = useState<ExportPublishMode>("export");
  const [exporting, setExporting] = useState(false);
  const [exportResultPath, setExportResultPath] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [zenDotExpanded, setZenDotExpanded] = useState(false);
  const [zenCapsuleHovered, setZenCapsuleHovered] = useState(false);
  const [sessionStartAt] = useState(() => Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const autosave = useAutosaveController({ api, activeContextTokenRef, userEditRevisionRef });
  const layout = usePanelLayout();

  // @why Async callbacks (handleCreateDocument, handleOpenDocument) capture a
  // stale `layout.zenMode` closure value. This ref tracks the *latest* zen
  // state so post-await layout writes can be skipped when zen is active,
  // preventing layout mutation during zen mode (FE-01 R8).
  // useLayoutEffect (not useEffect) ensures the ref is updated synchronously
  // after React commits, before any microtask/promise continuation can read it.
  const zenModeRef = useRef(layout.zenMode);
  useLayoutEffect(() => {
    zenModeRef.current = layout.zenMode;
  }, [layout.zenMode]);

  useEffect(() => {
    bootstrapStatusRef.current = bootstrapStatus;
  }, [bootstrapStatus]);

  useEffect(() => {
    selectionToolbarPromptOpenRef.current = selectionToolbarPromptOpen;
  }, [selectionToolbarPromptOpen]);

  const dismissSelectionToolbar = useCallback(() => {
    setSelectionToolbarAnchor(null);
    setSelectionToolbarResetKey(null);
    setSelectionToolbarPromptOpen(false);
  }, []);

  useEffect(() => {
    const updateElapsedMinutes = () => {
      setElapsedMinutes(Math.max(0, Math.floor((Date.now() - sessionStartAt) / 60000)));
    };

    // @why The files rail can legitimately render long project lists. Updating
    // the creative-duration badge only when the visible minute changes keeps
    // the whole workbench from pointlessly re-rendering every second.
    updateElapsedMinutes();
    const remainingUntilNextMinute = 60000 - ((Date.now() - sessionStartAt) % 60000);
    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      updateElapsedMinutes();
      intervalId = window.setInterval(updateElapsedMinutes, 60000);
    }, remainingUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [sessionStartAt]);

  useEffect(() => {
    if (layout.zenMode === false) {
      return;
    }

    setProjectMenuOpen(false);
    setScenarioMenuOpen(false);
  }, [layout.zenMode]);

  useEffect(() => {
    if (restoreDialogSnapshot !== null) {
      setCommandPaletteOpen(false);
    }
  }, [restoreDialogSnapshot]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        if (restoreDialogSnapshot !== null) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setCommandPaletteOpen((current) => {
          const next = !current;
          if (next) {
            setCommandPaletteQuery("");
          }
          return next;
        });
        return;
      }

      const blocksLayoutShortcut = commandPaletteOpen && (
        (event.shiftKey && key === "z" && !event.metaKey && !event.ctrlKey && !event.altKey)
        || ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && (event.key === "\\" || key === "l"))
      );
      if (blocksLayoutShortcut) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (commandPaletteOpen && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown, true);
    };
  }, [commandPaletteOpen, restoreDialogSnapshot]);

  const triggerWorldbuildingReload = useCallback(() => {
    setWorldbuildingReloadToken((value) => value + 1);
  }, []);

  const triggerKnowledgeGraphReload = useCallback(() => {
    setKnowledgeGraphReloadToken((value) => value + 1);
  }, []);

  const triggerMemoryReload = useCallback(() => {
    setMemoryReloadToken((value) => value + 1);
  }, []);

  const triggerSearchReload = useCallback(() => {
    setSearchReloadToken((value) => value + 1);
  }, []);

  const scenarioTemplates = useMemo<ScenarioTemplate[]>(
    () =>
      SCENARIO_ITEMS.map((scenario) => ({
        description: scenario.description,
        id: scenario.id,
        labelKey: scenario.labelKey,
        profileKey: scenario.profileKey,
      })),
    [],
  );

  useEffect(() => {
    const rawValue = window.localStorage.getItem(WELCOME_SCENARIOS_KEY);
    if (rawValue === null) {
      return;
    }
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed) === false) {
        return;
      }
      const preferredScenario = parsed.find((value): value is ScenarioId => (
        typeof value === "string" && isScenarioId(value)
      ));
      if (preferredScenario !== undefined) {
        setActiveScenarioId(preferredScenario);
      }
    } catch {
      // ignore malformed onboarding payload
    }
  }, []);

  const handleScenarioSelect = useCallback((scenarioId: string) => {
    if (isScenarioId(scenarioId) === false) {
      return;
    }
    setActiveScenarioId(scenarioId);
  }, []);

  const calendarMilestones = useMemo<CalendarMilestone[]>(
    () => [
      {
        id: "milestone-chapter",
        dateLabel: t("sidebar.calendar.milestoneDate.current"),
        description: t("sidebar.calendar.milestoneDesc.current"),
        status: "active",
        title: t("sidebar.calendar.milestoneTitle.current"),
      },
      {
        id: "milestone-conflict",
        dateLabel: t("sidebar.calendar.milestoneDate.upcoming"),
        description: t("sidebar.calendar.milestoneDesc.upcoming"),
        status: "upcoming",
        title: t("sidebar.calendar.milestoneTitle.upcoming"),
      },
      {
        id: "milestone-publish",
        dateLabel: t("sidebar.calendar.milestoneDate.draft"),
        description: t("sidebar.calendar.milestoneDesc.draft"),
        status: "draft",
        title: t("sidebar.calendar.milestoneTitle.draft"),
      },
    ],
    [t],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      documents.slice(0, 8).map((document, index) => ({
        day: (index % 28) + 1,
        id: document.documentId,
        title: document.title,
        type: index % 3 === 0 ? "fiction" : index % 3 === 1 ? "script" : "media",
      })),
    [documents],
  );

  const openExportModal = useCallback((mode: ExportPublishMode = "export") => {
    setExportModalMode(mode);
    setExportErrorMessage(null);
    setExportResultPath(null);
    setExportModalOpen(true);
  }, []);

  const handleExportDocument = useCallback(async (format: ExportFormat) => {
    if (project === null) {
      setExportErrorMessage(t("export.modal.error.noProject"));
      return;
    }
    const exportApi = api.export;
    if (!exportApi) {
      setExportErrorMessage(t("export.modal.error.unavailable"));
      return;
    }
    const invokeExport = format === "docx"
      ? exportApi.docx
      : format === "markdown"
        ? exportApi.markdown
        : format === "pdf"
          ? exportApi.pdf
          : exportApi.txt;

    setExporting(true);
    setExportErrorMessage(null);
    setExportResultPath(null);
    try {
      const result = await invokeExport({
        documentId: activeDocument?.documentId,
        projectId: project.projectId,
      });
      if (result.ok === false) {
        setExportErrorMessage(getHumanErrorMessage(result.error, t));
        return;
      }
      setExportResultPath(result.data?.relativePath ?? t("export.modal.success.fallbackPath"));
    } catch (error) {
      setExportErrorMessage(getHumanErrorMessage(error as Error, t));
    } finally {
      setExporting(false);
    }
  }, [activeDocument?.documentId, api, project, t]);

  const handleScenarioRetry = useCallback(() => {
    setScenariosStatus("ready");
    setScenariosErrorMessage(null);
  }, []);

  const handleCalendarRetry = useCallback(() => {
    setCalendarStatus("ready");
    setCalendarErrorMessage(null);
  }, []);

  const handleCreateWorldbuildingEntry = useCallback(() => {
    layout.setActiveLeftPanel("settings");
  }, [layout]);

  useEffect(() => {
    if (project === null) {
      return;
    }
    setWorldbuildingQuery("");
    setWorldbuildingTab("encyclopedia");
  }, [project?.projectId]);

  useEffect(() => {
    setMemoryQuery("");
  }, [project?.projectId]);

  useEffect(() => {
    setSearchQuery("");
  }, [project?.projectId]);

  useEffect(() => {
    setKnowledgeGraphQuery("");
    setKnowledgeGraphView("graph");
  }, [project?.projectId]);

  useEffect(() => {
    if (layout.activeLeftPanel !== "search") {
      return;
    }
    if (project === null) {
      setSearchResults([]);
      setSearchStatus("error");
      setSearchErrorMessage(t("sidebar.search.errorNoProject"));
      setSearchEffectiveStrategy(searchStrategy);
      setSearchNotice(null);
      return;
    }

    const queryText = searchQuery.trim();
    if (queryText.length === 0) {
      setSearchResults([]);
      setSearchStatus("ready");
      setSearchErrorMessage(null);
      setSearchEffectiveStrategy(searchStrategy);
      setSearchNotice(null);
      return;
    }

    const queryByStrategy = api.search.queryByStrategy;
    const semanticQuery = api.search.semanticQuery;
    const ftsQuery = api.search.query;
    if (
      typeof queryByStrategy !== "function"
      && typeof semanticQuery !== "function"
      && typeof ftsQuery !== "function"
    ) {
      setSearchResults([]);
      setSearchStatus("error");
      setSearchErrorMessage(t("sidebar.search.errorBridgeUnavailable"));
      setSearchEffectiveStrategy(searchStrategy);
      setSearchNotice(null);
      return;
    }

    const mapRankedResult = (
      items: Array<{
        chunkId: string;
        documentId: string;
        finalScore: number;
        snippet: string;
        updatedAt: number;
      }>,
      strategy: SearchStrategy,
    ): SearchPanelResult[] =>
      items.map((item) => ({
        documentId: item.documentId,
        id: `${item.documentId}:${item.chunkId}`,
        score: item.finalScore,
        snippet: item.snippet,
        strategy,
        updatedAt: item.updatedAt,
      }));
    const applyRankedResponse = (payload: {
      notice?: string;
      results: Array<{
        chunkId: string;
        documentId: string;
        finalScore: number;
        snippet: string;
        updatedAt: number;
      }>;
      strategy: SearchStrategy;
    }) => {
      setSearchResults(mapRankedResult(payload.results, payload.strategy));
      setSearchEffectiveStrategy(payload.strategy);
      setSearchNotice(payload.notice ?? null);
      setSearchStatus("ready");
      setSearchErrorMessage(null);
    };
    const applyFtsResponse = (
      items: Array<{
        anchor: { end: number; start: number };
        documentId: string;
        documentTitle: string;
        score: number;
        snippet: string;
        updatedAt: number;
      }>,
    ) => {
      setSearchResults(
        items.map((item) => ({
          documentId: item.documentId,
          id: `${item.documentId}:${item.anchor.start}-${item.anchor.end}`,
          score: item.score,
          snippet: item.snippet,
          strategy: "fts" as const,
          title: item.documentTitle,
          updatedAt: item.updatedAt,
        })),
      );
      setSearchEffectiveStrategy("fts");
      setSearchNotice(null);
      setSearchStatus("ready");
      setSearchErrorMessage(null);
    };

    let cancelled = false;
    setSearchResults([]);
    setSearchStatus("loading");
    setSearchErrorMessage(null);
    setSearchEffectiveStrategy(searchStrategy);
    setSearchNotice(null);

    void (async () => {
      try {
        if (searchStrategy === "fts" && typeof ftsQuery === "function" && typeof queryByStrategy !== "function") {
          const result = await ftsQuery({
            limit: 20,
            offset: 0,
            projectId: project.projectId,
            query: queryText,
          });
          if (!result.ok) {
            if (cancelled) {
              return;
            }
            setSearchResults([]);
            setSearchStatus("error");
            setSearchErrorMessage(getHumanErrorMessage(result.error, t));
            setSearchNotice(null);
            return;
          }
          if (cancelled) {
            return;
          }
          applyFtsResponse(result.data.results);
          return;
        }

        if (searchStrategy === "semantic") {
          if (typeof semanticQuery === "function") {
            const result = await semanticQuery({
              limit: 20,
              offset: 0,
              projectId: project.projectId,
              query: queryText,
              strategy: "semantic",
            });
            if (!result.ok) {
              if (cancelled) {
                return;
              }
              setSearchResults([]);
              setSearchStatus("error");
              setSearchErrorMessage(getHumanErrorMessage(result.error, t));
              setSearchNotice(null);
              return;
            }
            if (cancelled) {
              return;
            }
            applyRankedResponse({
              notice: result.data.notice,
              results: result.data.results,
              strategy: result.data.strategy,
            });
            return;
          }

          if (typeof queryByStrategy === "function") {
            const result = await queryByStrategy({
              limit: 20,
              offset: 0,
              projectId: project.projectId,
              query: queryText,
              strategy: "semantic",
            });
            if (!result.ok) {
              if (cancelled) {
                return;
              }
              setSearchResults([]);
              setSearchStatus("error");
              setSearchErrorMessage(getHumanErrorMessage(result.error, t));
              setSearchNotice(null);
              return;
            }
            if (cancelled) {
              return;
            }
            applyRankedResponse({
              notice: result.data.notice,
              results: result.data.results,
              strategy: result.data.strategy,
            });
            return;
          }
        }

        if (typeof queryByStrategy === "function") {
          const result = await queryByStrategy({
            limit: 20,
            offset: 0,
            projectId: project.projectId,
            query: queryText,
            strategy: searchStrategy,
          });
          if (!result.ok) {
            if (cancelled) {
              return;
            }
            setSearchResults([]);
            setSearchStatus("error");
            setSearchErrorMessage(getHumanErrorMessage(result.error, t));
            setSearchNotice(null);
            return;
          }
          if (cancelled) {
            return;
          }
          applyRankedResponse({
            notice: result.data.notice,
            results: result.data.results,
            strategy: result.data.strategy,
          });
          return;
        }

        if (typeof semanticQuery === "function") {
          const result = await semanticQuery({
            limit: 20,
            offset: 0,
            projectId: project.projectId,
            query: queryText,
            strategy: "hybrid",
          });
          if (!result.ok) {
            if (cancelled) {
              return;
            }
            setSearchResults([]);
            setSearchStatus("error");
            setSearchErrorMessage(getHumanErrorMessage(result.error, t));
            setSearchNotice(null);
            return;
          }
          if (cancelled) {
            return;
          }
          applyRankedResponse({
            notice: result.data.notice,
            results: result.data.results,
            strategy: result.data.strategy,
          });
          return;
        }

        if (typeof ftsQuery === "function") {
          const result = await ftsQuery({
            limit: 20,
            offset: 0,
            projectId: project.projectId,
            query: queryText,
          });
          if (!result.ok) {
            if (cancelled) {
              return;
            }
            setSearchResults([]);
            setSearchStatus("error");
            setSearchErrorMessage(getHumanErrorMessage(result.error, t));
            setSearchNotice(null);
            return;
          }
          if (cancelled) {
            return;
          }
          applyFtsResponse(result.data.results);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSearchResults([]);
        setSearchStatus("error");
        setSearchErrorMessage(getHumanErrorMessage(error as Error, t));
        setSearchNotice(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    api.search,
    layout.activeLeftPanel,
    project?.projectId,
    searchQuery,
    searchReloadToken,
    searchStrategy,
    t,
  ]);

  useEffect(() => {
    if (layout.activeLeftPanel !== "worldbuilding") {
      return;
    }
    if (project === null) {
      setWorldbuildingEntries([]);
      setWorldbuildingStatus("error");
      setWorldbuildingErrorMessage(t("sidebar.worldbuilding.errorNoProject"));
      return;
    }

    const listLocations = (api.location as Partial<PreloadApi["location"]>).list;
    if (typeof listLocations !== "function") {
      setWorldbuildingEntries([]);
      setWorldbuildingStatus("error");
      setWorldbuildingErrorMessage(t("sidebar.worldbuilding.errorBridgeUnavailable"));
      return;
    }

    let cancelled = false;
    setWorldbuildingEntries([]);
    setWorldbuildingStatus("loading");
    setWorldbuildingErrorMessage(null);

    void listLocations({ projectId: project.projectId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setWorldbuildingEntries([]);
          setWorldbuildingStatus("error");
          setWorldbuildingErrorMessage(getHumanErrorMessage(result.error, t));
          return;
        }
        const entries = result.data.items.map((location) => mapLocationToWorldbuildingEntry(location, t));
        setWorldbuildingEntries(entries);
        setWorldbuildingStatus("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setWorldbuildingEntries([]);
        setWorldbuildingStatus("error");
        setWorldbuildingErrorMessage(getHumanErrorMessage(error as Error, t));
      });

    return () => {
      cancelled = true;
    };
  }, [api, layout.activeLeftPanel, project?.projectId, t, worldbuildingReloadToken]);

  useEffect(() => {
    if (layout.activeLeftPanel !== "knowledgeGraph") {
      return;
    }
    if (project === null) {
      setKnowledgeGraphNodes([]);
      setKnowledgeGraphEdges([]);
      setKnowledgeGraphStatus("error");
      setKnowledgeGraphErrorMessage(t("sidebar.knowledgeGraph.errorNoProject"));
      setKnowledgeGraphNoticeMessage(null);
      return;
    }

    const listEntities = api.knowledge?.listEntities;
    const listRelations = api.knowledge?.listRelations;
    const listCharacters = (api.character as Partial<PreloadApi["character"]>).list;
    const listLocations = (api.location as Partial<PreloadApi["location"]>).list;
    const hasKnowledgeApi =
      typeof listEntities === "function" && typeof listRelations === "function";
    if (!hasKnowledgeApi && typeof listCharacters !== "function" && typeof listLocations !== "function") {
      setKnowledgeGraphNodes([]);
      setKnowledgeGraphEdges([]);
      setKnowledgeGraphStatus("error");
      setKnowledgeGraphErrorMessage(t("sidebar.knowledgeGraph.errorBridgeUnavailable"));
      setKnowledgeGraphNoticeMessage(null);
      return;
    }

    let cancelled = false;
    setKnowledgeGraphNodes([]);
    setKnowledgeGraphEdges([]);
    setKnowledgeGraphStatus("loading");
    setKnowledgeGraphErrorMessage(null);
    setKnowledgeGraphNoticeMessage(null);

    void (async () => {
      if (hasKnowledgeApi && typeof listEntities === "function" && typeof listRelations === "function") {
        try {
          const entitiesResult = await loadPagedKnowledgeItems<KnowledgeEntityListItem>({
            isCancelled: () => cancelled,
            maxItems: KNOWLEDGE_GRAPH_MAX_ENTITY_ITEMS,
            pageSize: KNOWLEDGE_GRAPH_ENTITY_PAGE_SIZE,
            queryPage: (offset, limit) =>
              listEntities({
                limit,
                offset,
                projectId: project.projectId,
              }),
          });

          if (cancelled) {
            return;
          }

          if (!entitiesResult.ok) {
            setKnowledgeGraphNodes([]);
            setKnowledgeGraphEdges([]);
            setKnowledgeGraphStatus("error");
            setKnowledgeGraphErrorMessage(getHumanErrorMessage(entitiesResult.error, t));
            setKnowledgeGraphNoticeMessage(null);
            return;
          }

          const sortedNodes = entitiesResult.data.items
            .map(mapKnowledgeEntityToNode)
            .sort((left, right) => right.updatedAt - left.updatedAt);
          const visibleNodeIds = new Set(sortedNodes.map((node) => node.id));

          const collectedVisibleRelations: KnowledgeRelationListItem[] = [];
          let relationOffset = 0;
          let relationTotalCount = 0;
          let relationBudgetOverflow = false;

          for (
            let pageIndex = 0;
            pageIndex < KNOWLEDGE_GRAPH_MAX_PAGE_REQUESTS
            && collectedVisibleRelations.length < KNOWLEDGE_GRAPH_MAX_RELATION_ITEMS;
            pageIndex += 1
          ) {
            if (cancelled) {
              return;
            }

            const relationPageResult = await listRelations({
              limit: KNOWLEDGE_GRAPH_RELATION_PAGE_SIZE,
              offset: relationOffset,
              projectId: project.projectId,
            });

            if (cancelled) {
              return;
            }

            if (!relationPageResult.ok) {
              setKnowledgeGraphNodes([]);
              setKnowledgeGraphEdges([]);
              setKnowledgeGraphStatus("error");
              setKnowledgeGraphErrorMessage(getHumanErrorMessage(relationPageResult.error, t));
              setKnowledgeGraphNoticeMessage(null);
              return;
            }

            relationTotalCount = relationPageResult.data.totalCount;
            relationOffset += relationPageResult.data.items.length;

            const filteredVisibleRelations = relationPageResult.data.items.filter(
              (relation) =>
                visibleNodeIds.has(relation.sourceEntityId) && visibleNodeIds.has(relation.targetEntityId),
            );
            if (filteredVisibleRelations.length > 0) {
              const remaining = Math.max(KNOWLEDGE_GRAPH_MAX_RELATION_ITEMS - collectedVisibleRelations.length, 0);
              if (filteredVisibleRelations.length > remaining) {
                relationBudgetOverflow = true;
              }
              collectedVisibleRelations.push(...filteredVisibleRelations.slice(0, remaining));
            }

            const reachedTotalCount = relationTotalCount > 0 && relationOffset >= relationTotalCount;
            const reachedPageEnd = relationPageResult.data.items.length === 0;
            if (reachedTotalCount || reachedPageEnd) {
              break;
            }
          }

          const relationsTruncated = (relationTotalCount > relationOffset) || relationBudgetOverflow;

          setKnowledgeGraphNodes(sortedNodes);
          setKnowledgeGraphEdges(collectedVisibleRelations.map(mapKnowledgeRelationToEdge));
          setKnowledgeGraphStatus("ready");
          setKnowledgeGraphErrorMessage(null);
          if (entitiesResult.data.truncated || relationsTruncated) {
            setKnowledgeGraphNoticeMessage(
              t("sidebar.knowledgeGraph.notice.truncated", {
                loadedEdges: collectedVisibleRelations.length,
                loadedNodes: entitiesResult.data.items.length,
                totalEdges: relationTotalCount,
                totalNodes: entitiesResult.data.totalCount,
              }),
            );
          } else {
            setKnowledgeGraphNoticeMessage(null);
          }
          return;
        } catch (error) {
          if (cancelled) {
            return;
          }
          setKnowledgeGraphNodes([]);
          setKnowledgeGraphEdges([]);
          setKnowledgeGraphStatus("error");
          setKnowledgeGraphErrorMessage(getHumanErrorMessage(error as Error, t));
          setKnowledgeGraphNoticeMessage(null);
          return;
        }
      }

      const collectedNodes: WorkbenchKnowledgeGraphNode[] = [];
      let firstError: string | null = null;

      if (typeof listCharacters === "function") {
        try {
          const result = await listCharacters({ projectId: project.projectId });
          if (result.ok) {
            collectedNodes.push(...result.data.items.map(mapCharacterToKnowledgeNode));
          } else {
            firstError ??= getHumanErrorMessage(result.error, t);
          }
        } catch (error) {
          firstError ??= getHumanErrorMessage(error as Error, t);
        }
      }

      if (typeof listLocations === "function") {
        try {
          const result = await listLocations({ projectId: project.projectId });
          if (result.ok) {
            collectedNodes.push(...result.data.items.map(mapLocationToKnowledgeNode));
          } else {
            firstError ??= getHumanErrorMessage(result.error, t);
          }
        } catch (error) {
          firstError ??= getHumanErrorMessage(error as Error, t);
        }
      }

      if (cancelled) {
        return;
      }

      if (collectedNodes.length === 0 && firstError !== null) {
        setKnowledgeGraphNodes([]);
        setKnowledgeGraphEdges([]);
        setKnowledgeGraphStatus("error");
        setKnowledgeGraphErrorMessage(firstError);
        setKnowledgeGraphNoticeMessage(null);
        return;
      }

      const sortedNodes = collectedNodes.sort((left, right) => right.updatedAt - left.updatedAt);
      setKnowledgeGraphNodes(sortedNodes);
      setKnowledgeGraphEdges([]);
      setKnowledgeGraphStatus("ready");
      setKnowledgeGraphErrorMessage(null);
      setKnowledgeGraphNoticeMessage(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [api, knowledgeGraphReloadToken, layout.activeLeftPanel, project?.projectId, t]);

  useEffect(() => {
    if (layout.activeLeftPanel !== "memory") {
      return;
    }

    const listMemory = api.memory?.list;
    const listSemanticRules = api.memory?.semanticList;
    const listEpisodes = api.memory?.episodeQuery;
    if (typeof listMemory !== "function") {
      setMemoryEntries([]);
      setMemoryStatus("error");
      setMemoryErrorMessage(t("sidebar.memory.errorBridgeUnavailable"));
      return;
    }

    let cancelled = false;
    setMemoryEntries([]);
    setMemoryStatus("loading");
    setMemoryErrorMessage(null);

    void (async () => {
      try {
        const projectId = project?.projectId ?? null;
        const baseResult = await listMemory({ projectId });
        if (!baseResult.ok) {
          if (cancelled) {
            return;
          }
          setMemoryEntries([]);
          setMemoryStatus("error");
          setMemoryErrorMessage(getHumanErrorMessage(baseResult.error, t));
          return;
        }

        const merged = baseResult.data.items.map(mapMemoryItemToPanelEntry);
        const activeProjectId = project?.projectId;

        if (activeProjectId && typeof listSemanticRules === "function") {
          const semanticResult = await listSemanticRules({ projectId: activeProjectId });
          if (semanticResult.ok) {
            merged.push(...semanticResult.data.items.map(mapSemanticRuleToPanelEntry));
          } else {
            throw new Error(getHumanErrorMessage(semanticResult.error, t));
          }
        }

        if (activeProjectId && typeof listEpisodes === "function") {
          const episodicResult = await listEpisodes({
            projectId: activeProjectId,
            sceneType: activeScenarioId,
            limit: 5,
          });
          if (episodicResult.ok) {
            merged.push(...episodicResult.data.items.map(mapEpisodeToPanelEntry));
          } else {
            throw new Error(getHumanErrorMessage(episodicResult.error, t));
          }
        }

        if (cancelled) {
          return;
        }
        const entries = merged.sort((left, right) => right.updatedAt - left.updatedAt);
        setMemoryEntries(entries);
        setMemoryStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setMemoryEntries([]);
        setMemoryStatus("error");
        setMemoryErrorMessage(getHumanErrorMessage(error as Error, t));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeScenarioId, api.memory, layout.activeLeftPanel, memoryReloadToken, project?.projectId, t]);

  const editorBridge = useMemo(
    () =>
      createEditorBridge({
        onSelectionChange: (nextSelection) => {
          setLiveSelection(nextSelection);

          if (bootstrapStatusRef.current !== "ready" || isMeaningfulSelection(nextSelection) === false) {
            const activeElement = document.activeElement;
            const keepPromptOpen = selectionToolbarPromptOpenRef.current
              && activeElement instanceof Element
              && activeElement.closest(".editor-selection-toolbar") !== null;
            if (keepPromptOpen === false) {
              dismissSelectionToolbar();
            }
            return;
          }

          setSelectionToolbarResetKey(
            `${nextSelection.from}:${nextSelection.to}:${nextSelection.selectionTextHash}`,
          );
          setSelectionToolbarAnchor(editorBridge.getSelectionViewportAnchor());
          setStickySelection(nextSelection);
          setPreview(null);
          autosave.clearAcceptSaveFailure();
          autosave.setWorkbenchError(null, null);
        },
        onDocumentChange: autosave.scheduleAutosave,
      }),
    [autosave.clearAcceptSaveFailure, autosave.setWorkbenchError, autosave.scheduleAutosave],
  );

  const aiSkill = useAiSkillController({
    api,
    activeContextTokenRef,
    editorBridge,
    autosave,
    stickySelection,
    setStickySelection,
    setPreview,
    preview,
    userEditRevisionRef,
    editorContextRevisionRef,
  });
  const resetAiConversation = aiSkill.resetAiConversation;

  const versionHistoryDocument = useMemo(
    () => activeDocument === null
      ? null
      : {
          documentId: activeDocument.documentId,
          projectId: activeDocument.projectId,
        },
    [activeDocument?.documentId, activeDocument?.projectId],
  );
  const versionHistory = useVersionHistoryController({
    activeDocument: versionHistoryDocument,
    api: api.version,
    enabled: layout.activeLeftPanel === "versionHistory" && layout.sidebarCollapsed === false,
  });
  const versionPreviewSnapshot = versionPreviewState?.snapshot ?? null;
  const isVersionPreviewActive = versionPreviewSnapshot !== null;

  const replaceEditorContextContent = useCallback((nextContext: {
    contentJson: string;
    documentId: string;
    projectId: string;
  }) => {
    autosave.clearPendingAutosaveTimer();
    autosave.pendingAutosaveDraftRef.current = null;
    autosave.clearSavedStateDecayTimer();
    autosave.clearAutosaveController();
    autosave.clearAcceptSaveFailure();
    editorContextRevisionRef.current += 1;
    activeContextTokenRef.current = {
      documentId: nextContext.documentId,
      projectId: nextContext.projectId,
      revision: editorContextRevisionRef.current,
    };
    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    autosave.runWithoutAutosave(() => {
      editorBridge.setEditable(true);
      editorBridge.setContent(JSON.parse(nextContext.contentJson));
    });
  }, [
    autosave.clearPendingAutosaveTimer,
    autosave.pendingAutosaveDraftRef,
    autosave.clearSavedStateDecayTimer,
    autosave.clearAutosaveController,
    autosave.clearAcceptSaveFailure,
    autosave.runWithoutAutosave,
    editorBridge,
  ]);

  const startVersionPreview = useCallback((snapshot: VersionHistorySnapshotDetail) => {
    autosave.setWorkbenchError(null, null);
    setRestoreDialogSnapshot(null);
    setVersionPreviewState((currentPreview) => ({
      currentContentJson: currentPreview?.currentContentJson ?? JSON.stringify(editorBridge.getContent()),
      snapshot,
    }));
    autosave.runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(snapshot.contentJson));
      editorBridge.setEditable(false);
    });
  }, [autosave.setWorkbenchError, autosave.runWithoutAutosave, editorBridge]);

  const handleReturnToCurrentVersion = useCallback(() => {
    if (versionPreviewState === null) {
      return;
    }

    setRestoreDialogSnapshot(null);
    setVersionPreviewState(null);
    autosave.runWithoutAutosave(() => {
      editorBridge.setContent(JSON.parse(versionPreviewState.currentContentJson));
      editorBridge.setEditable(true);
    });
  }, [autosave.runWithoutAutosave, editorBridge, versionPreviewState]);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    editorBridge.mount(containerRef.current);
    editorBridge.focus();

    return () => {
      autosave.clearPendingAutosaveTimer();
      autosave.clearSavedStateDecayTimer();
      editorBridge.destroy();
    };
  }, [autosave.clearPendingAutosaveTimer, autosave.clearSavedStateDecayTimer, editorBridge]);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      try {
        autosave.clearPendingAutosaveTimer();
        autosave.clearSavedStateDecayTimer();
        setBootstrapStatus("loading");
        autosave.setWorkbenchError(null, null);
        const workspace = await bootstrapWorkspace(api, {
          defaultProjectName: t("project.defaultName"),
          defaultDocumentTitle: t("document.defaultTitle"),
        });
        if (disposed) {
          return;
        }

        replaceEditorContextContent({
          contentJson: workspace.activeDocument.contentJson,
          documentId: workspace.activeDocument.documentId,
          projectId: workspace.project.projectId,
        });
        setProject(workspace.project);
        setDocuments(workspace.documents);
        setActiveDocument(workspace.activeDocument);
        autosave.setSaveUiState("idle");
        autosave.setLastSavedAt(workspace.activeDocument.updatedAt);
        resetAiConversation();
        setLiveSelection(null);
        dismissSelectionToolbar();
        setBootstrapStatus("ready");
      } catch (error) {
        if (disposed === false) {
          autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
          setBootstrapStatus("error");
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [
    api,
    resetAiConversation,
    autosave.clearPendingAutosaveTimer,
    autosave.clearSavedStateDecayTimer,
    autosave.setWorkbenchError,
    autosave.setSaveUiState,
    autosave.setLastSavedAt,
    dismissSelectionToolbar,
    replaceEditorContextContent,
    t,
  ]);

  useEffect(() => {
    if (bootstrapStatus !== "ready" || preview !== null || isVersionPreviewActive) {
      dismissSelectionToolbar();
      return;
    }
  }, [
    bootstrapStatus,
    dismissSelectionToolbar,
    isVersionPreviewActive,
    preview,
  ]);

  useEffect(() => {
    if (selectionToolbarAnchor === null) {
      return;
    }

    const syncSelectionToolbarAnchor = () => {
      if (selectionToolbarPromptOpenRef.current) {
        return;
      }
      setSelectionToolbarAnchor(editorBridge.getSelectionViewportAnchor());
    };

    window.addEventListener("resize", syncSelectionToolbarAnchor);
    window.addEventListener("scroll", dismissSelectionToolbar, true);
    return () => {
      window.removeEventListener("resize", syncSelectionToolbarAnchor);
      window.removeEventListener("scroll", dismissSelectionToolbar, true);
    };
  }, [dismissSelectionToolbar, editorBridge, selectionToolbarAnchor]);

  useEffect(() => {
    if (selectionToolbarAnchor === null) {
      return;
    }

    const dismissSelectionToolbarFromOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if ((target instanceof Element) === false) {
        return;
      }

      if (
        target.closest(".editor-selection-toolbar") !== null
        || target.closest(".ProseMirror") !== null
      ) {
        return;
      }

      dismissSelectionToolbar();
    };

    document.addEventListener("mousedown", dismissSelectionToolbarFromOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", dismissSelectionToolbarFromOutsideClick, true);
    };
  }, [dismissSelectionToolbar, selectionToolbarAnchor]);

  const handleCreateDocument = async () => {
    if (project === null) {
      return;
    }

    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      await autosave.flushDirtyDraftBeforeContextSwitch();
      const result = await createDocumentAndOpen({
        api,
        projectId: project.projectId,
        defaultDocumentTitle: t("document.defaultTitle"),
      });
      replaceEditorContextContent({
        contentJson: result.activeDocument.contentJson,
        documentId: result.activeDocument.documentId,
        projectId: result.activeDocument.projectId,
      });
      setDocuments(result.documents);
      setActiveDocument(result.activeDocument);
      resetAiConversation();
      setLiveSelection(null);
      dismissSelectionToolbar();
      autosave.setSaveUiState("idle");
      autosave.setLastSavedAt(result.activeDocument.updatedAt);
      autosave.setWorkbenchError(null, null);
      if (!zenModeRef.current) {
        layout.setActiveLeftPanel("files");
        layout.setSidebarCollapsed(false);
      }
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
      }
    }
  };

  const handleOpenDocument = useCallback(async (documentId: string) => {
    if (project === null) {
      return;
    }

    if (activeDocument !== null && documentId === activeDocument.documentId) {
      return;
    }

    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      await autosave.flushDirtyDraftBeforeContextSwitch();
      const readDocument = await openDocument({
        api,
        projectId: project.projectId,
        documentId,
      });
      replaceEditorContextContent({
        contentJson: readDocument.contentJson,
        documentId: readDocument.documentId,
        projectId: readDocument.projectId,
      });
      setActiveDocument(readDocument);
      resetAiConversation();
      setLiveSelection(null);
      dismissSelectionToolbar();
      autosave.setWorkbenchError(null, null);
      autosave.setSaveUiState("idle");
      autosave.setLastSavedAt(readDocument.updatedAt);
      if (!zenModeRef.current) {
        layout.setActiveLeftPanel("files");
        layout.setSidebarCollapsed(false);
      }
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
      }
    }
  }, [
    activeDocument,
    aiSkill,
    api,
    autosave,
    layout,
    dismissSelectionToolbar,
    project,
    replaceEditorContextContent,
    t,
  ]);

  const refreshActiveDocumentFromDisk = useCallback(async () => {
    if (activeDocument === null) {
      return null;
    }

    const readDocument = await api.file.readDocument({
      documentId: activeDocument.documentId,
      projectId: activeDocument.projectId,
    });
    if (readDocument.ok === false) {
      throw readDocument.error;
    }

    replaceEditorContextContent({
      contentJson: readDocument.data.contentJson,
      documentId: readDocument.data.documentId,
      projectId: readDocument.data.projectId,
    });
    setActiveDocument(readDocument.data);
    setDocuments((currentDocuments) => currentDocuments.map((document) =>
      document.documentId === readDocument.data.documentId
        ? {
            ...document,
            status: readDocument.data.status,
            title: readDocument.data.title,
            updatedAt: readDocument.data.updatedAt,
          }
        : document,
    ));
    resetAiConversation();
    setLiveSelection(null);
    dismissSelectionToolbar();
    autosave.setSaveUiState("idle");
    autosave.setLastSavedAt(readDocument.data.updatedAt);
    return readDocument.data;
  }, [
    api.file,
    activeDocument,
    resetAiConversation,
    autosave.setSaveUiState,
    autosave.setLastSavedAt,
    dismissSelectionToolbar,
    replaceEditorContextContent,
  ]);

  const handleVersionHistoryRestore = useCallback(async () => {
    const busyOperationId = aiSkill.reserveBusyOperation();
    try {
      aiSkill.setBusy(true);
      autosave.setWorkbenchError(null, null);
      setRestoreDialogSnapshot(null);
      await autosave.flushDirtyDraftBeforeContextSwitch();
      const result = await versionHistory.restoreSelected();
      if (result === null) {
        return;
      }
      await refreshActiveDocumentFromDisk();
      await versionHistory.refresh();
    } catch (error) {
      if (error instanceof BlockedAutosaveError === false) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (aiSkill.isLatestBusyOperation(busyOperationId)) {
        aiSkill.setBusy(false);
      }
    }
  }, [
    aiSkill.reserveBusyOperation,
    aiSkill.setBusy,
    aiSkill.isLatestBusyOperation,
    autosave.setWorkbenchError,
    autosave.flushDirtyDraftBeforeContextSwitch,
    refreshActiveDocumentFromDisk,
    t,
    versionHistory,
  ]);

  const handleRequestVersionRestore = useCallback(() => {
    if (versionHistory.selectedSnapshot === null) {
      return;
    }

    setRestoreDialogSnapshot(versionHistory.selectedSnapshot);
  }, [versionHistory.selectedSnapshot]);

  const clearReference = () => {
    setStickySelection(null);
    dismissSelectionToolbar();
  };

  const handleToolbarSubmitInstruction = useCallback((nextInstruction: string) => {
    layout.handleRightPanelSelect("ai");
    void aiSkill.runQuickAction({
      instruction: nextInstruction,
      skillId: "builtin:rewrite",
    });
  }, [aiSkill, layout]);

  const handleToolbarPolish = useCallback(() => {
    layout.handleRightPanelSelect("ai");
    void aiSkill.runQuickAction({ skillId: "builtin:polish" });
  }, [aiSkill, layout]);

  const handleToolbarFixGrammar = useCallback(() => {
    layout.handleRightPanelSelect("ai");
    void aiSkill.runQuickAction({
      instruction: t("editorToolbar.presets.fixGrammar"),
      skillId: "builtin:rewrite",
    });
  }, [aiSkill, layout, t]);

  const handleToolbarChangeTone = useCallback(() => {
    layout.handleRightPanelSelect("ai");
    void aiSkill.runQuickAction({
      instruction: t("editorToolbar.presets.changeTone"),
      skillId: "builtin:rewrite",
    });
  }, [aiSkill, layout, t]);

  const handleStatusBarAction = () => {
    if (autosave.saveState !== "error") {
      return;
    }

    if (autosave.saveErrorSourceRef.current === "autosave") {
      autosave.retryLastAutosave();
      return;
    }

    if (autosave.saveErrorSourceRef.current === "accept") {
      aiSkill.retryLastAcceptSave();
    }
  };

  const runCommandPaletteAction = useCallback((action: () => void) => {
    setCommandPaletteOpen(false);
    setCommandPaletteQuery("");
    action();
  }, []);

  const openLeftPanel = useCallback((panelId: LeftPanelId) => {
    layout.setActiveLeftPanel(panelId);
    layout.setSidebarCollapsed(false);
  }, [layout]);

  const commandPaletteItems = useMemo<CommandPaletteItem[]>(() => {
    const navigationItems: CommandPaletteItem[] = [
      {
        id: "nav-dashboard",
        description: t("sidebar.dashboard.subtitle"),
        group: "navigation",
        label: t("iconBar.dashboard"),
      },
      {
        id: "nav-files",
        description: t("sidebar.files.subtitle"),
        group: "navigation",
        label: t("iconBar.files"),
      },
      {
        id: "nav-search",
        description: t("sidebar.search.subtitle"),
        group: "navigation",
        label: t("iconBar.search"),
      },
      {
        id: "nav-scenarios",
        description: t("sidebar.scenarios.subtitle"),
        group: "navigation",
        label: t("iconBar.scenarios"),
      },
      {
        id: "nav-memory",
        description: t("sidebar.memory.subtitle"),
        group: "navigation",
        label: t("iconBar.memory"),
      },
      {
        id: "nav-settings",
        description: t("sidebar.settings.subtitle"),
        group: "navigation",
        label: t("iconBar.settings"),
      },
      {
        id: "nav-ai",
        description: t("commandPalette.target.ai.description"),
        group: "navigation",
        label: t("commandPalette.target.ai.label"),
      },
    ];

    const scenarioItems: CommandPaletteItem[] = SCENARIO_ITEMS.map((scenario) => ({
      id: `scenario-${scenario.id}`,
      description: t("commandPalette.target.scenario.description"),
      group: "scenarios",
      label: t(scenario.labelKey),
      keywords: [scenario.id],
    }));

    const documentItems: CommandPaletteItem[] = documents.slice(0, 8).map((document) => ({
      id: `document-${document.documentId}`,
      description: formatTimestamp(document.updatedAt),
      group: "documents",
      label: document.title,
      keywords: [document.documentId],
    }));

    const actionItems: CommandPaletteItem[] = [
      {
        id: "action-new-document",
        description: t("commandPalette.action.newDocument.description"),
        group: "actions",
        label: t("commandPalette.action.newDocument.label"),
      },
      {
        id: "action-new-chat",
        description: t("commandPalette.action.newChat.description"),
        group: "actions",
        label: t("commandPalette.action.newChat.label"),
      },
      {
        id: "action-toggle-zen",
        description: t("commandPalette.action.toggleZen.description"),
        group: "actions",
        label: layout.zenMode ? t("zenMode.exit") : t("zenMode.enter"),
      },
    ];

    return [...navigationItems, ...scenarioItems, ...documentItems, ...actionItems];
  }, [documents, layout.zenMode, t]);

  const handleCommandPaletteSelect = useCallback((item: CommandPaletteItem) => {
    if (item.id.startsWith("document-")) {
      const documentId = item.id.slice("document-".length);
      runCommandPaletteAction(() => {
        void handleOpenDocument(documentId);
      });
      return;
    }

    if (item.id.startsWith("scenario-")) {
      const scenarioId = item.id.slice("scenario-".length);
      runCommandPaletteAction(() => {
        if (isScenarioId(scenarioId)) {
          setActiveScenarioId(scenarioId);
        }
        openLeftPanel("scenarios");
      });
      return;
    }

    switch (item.id) {
      case "nav-dashboard":
        runCommandPaletteAction(() => openLeftPanel("dashboard"));
        return;
      case "nav-files":
        runCommandPaletteAction(() => openLeftPanel("files"));
        return;
      case "nav-search":
        runCommandPaletteAction(() => openLeftPanel("search"));
        return;
      case "nav-scenarios":
        runCommandPaletteAction(() => openLeftPanel("scenarios"));
        return;
      case "nav-memory":
        runCommandPaletteAction(() => openLeftPanel("memory"));
        return;
      case "nav-settings":
        runCommandPaletteAction(() => openLeftPanel("settings"));
        return;
      case "nav-ai":
        runCommandPaletteAction(() => layout.handleRightPanelSelect("ai"));
        return;
      case "action-new-document":
        runCommandPaletteAction(() => {
          void handleCreateDocument();
        });
        return;
      case "action-new-chat":
        runCommandPaletteAction(() => {
          layout.handleRightPanelSelect("ai");
          aiSkill.resetAiConversation();
        });
        return;
      case "action-toggle-zen":
        runCommandPaletteAction(() => layout.toggleZenMode());
        return;
      default:
        runCommandPaletteAction(() => undefined);
    }
  }, [aiSkill, handleCreateDocument, handleOpenDocument, layout, openLeftPanel, runCommandPaletteAction]);

  const saveLabel =
    autosave.saveState === "saving"
      ? t("status.saving")
      : autosave.saveState === "saved"
        ? t("status.saved")
        : autosave.saveState === "error"
          ? t("status.error")
          : t("status.ready");

  const wordCount = editorBridge.getTextContent().trim().length;
  const activeScenario = SCENARIO_ITEMS.find((scenario) => scenario.id === activeScenarioId) ?? SCENARIO_ITEMS[0];
  const writingDurationLabel = formatCreativeDuration(elapsedMinutes, t);
  const selectionHint = isVersionPreviewActive
    ? t("versionHistory.previewReadonlyHint")
    : stickySelection
      ? t("panel.ai.selectionLength", { count: stickySelection.text.length })
      : liveSelection
        ? t("panel.ai.selectionLength", { count: liveSelection.text.length })
        : t("editor.selectionHint");
  const cursorContext = useMemo(
    () => aiSkill.activeSkill === "builtin:continue" ? editorBridge.getCursorContext() : null,
    [aiSkill.activeSkill, liveSelection, editorBridge],
  );
  const continueReady = (cursorContext?.precedingText.trim().length ?? 0) > 0;
  const instructionHint = aiSkill.activeSkill === "builtin:continue"
    ? continueReady
      ? t("panel.ai.continueContextLength", { count: cursorContext?.precedingText.length ?? 0 })
      : t("messages.continueContextEmpty")
    : selectionHint;
  const frameStyle = {
    "--left-resizer-width": (layout.zenMode || layout.sidebarCollapsed) ? "0px" : "8px",
    "--left-sidebar-width": (layout.zenMode || layout.sidebarCollapsed) ? "0px" : `${layout.sidebarWidth}px`,
    "--right-panel-width": (layout.zenMode || layout.rightPanelCollapsed) ? "0px" : `${layout.rightPanelWidth}px`,
    "--right-resizer-width": (layout.zenMode || layout.rightPanelCollapsed) ? "0px" : "8px",
    "--icon-rail-width": layout.zenMode ? "0px" : "48px",
  } as CSSProperties;

  const previewBannerLabel = versionPreviewSnapshot === null
    ? null
    : t("versionHistory.previewingVersion", {
        timestamp: formatTimestamp(versionPreviewSnapshot.createdAt),
      });
  const fileSidebarItems = useMemo(() => documents.map((document) => (
    <Button
      key={document.documentId}
      tone="ghost"
      className={document.documentId === activeDocument?.documentId ? "sidebar-item sidebar-item--active" : "sidebar-item"}
      onClick={() => void handleOpenDocument(document.documentId)}
    >
      <span className="sidebar-item__title">{document.title}</span>
      <span className="sidebar-item__meta">{formatTimestamp(document.updatedAt)}</span>
    </Button>
  )), [activeDocument?.documentId, documents, handleOpenDocument]);

  const renderSidebarContent = () => {
    if (layout.activeLeftPanel === "files") {
      return <>
        <div className="sidebar-project-switcher">
          <p className="sidebar-label">{t("sidebar.files.projectSwitcher")}</p>
          <button className="sidebar-project-button" type="button" onClick={() => setProjectMenuOpen((open) => !open)}>
            <div>
              <strong>{project?.name ?? t("project.defaultName")}</strong>
              <span>{t("sidebar.files.subtitle")}</span>
            </div>
            <ChevronDown size={14} aria-hidden="true" className={projectMenuOpen ? "sidebar-chevron sidebar-chevron--open" : "sidebar-chevron"} />
          </button>
          <AnimatePresence>
            {projectMenuOpen ? <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="sidebar-project-menu"
            >
              <button className="sidebar-project-menu__item" type="button" onClick={() => setProjectMenuOpen(false)}>
                {project?.name ?? t("project.defaultName")}
              </button>
            </motion.div> : null}
          </AnimatePresence>
        </div>
        <div className="sidebar-list">
          <div className="sidebar-list__header">
            <p className="sidebar-label">{t("sidebar.files.recentChapters")}</p>
            <Button tone="ghost" onClick={() => void handleCreateDocument()}>{t("sidebar.newDocument")}</Button>
          </div>
          {documents.length === 0 ? <p className="panel-meta">{t("sidebar.empty")}</p> : null}
          {fileSidebarItems}
        </div>
      </>;
    }

    if (layout.activeLeftPanel === "calendar") {
      return <CalendarPanel
        errorMessage={calendarErrorMessage}
        events={calendarEvents}
        milestones={calendarMilestones}
        onRetry={handleCalendarRetry}
        status={calendarStatus}
      />;
    }

    if (layout.activeLeftPanel === "search") {
      return <SearchPanel
        effectiveStrategy={searchEffectiveStrategy}
        errorMessage={searchErrorMessage}
        notice={searchNotice}
        onQueryChange={setSearchQuery}
        onRetry={triggerSearchReload}
        onStrategyChange={setSearchStrategy}
        query={searchQuery}
        results={searchResults}
        status={searchStatus}
        strategy={searchStrategy}
      />;
    }

    if (layout.activeLeftPanel === "scenarios") {
      return <ScenariosPanel
        activeScenarioId={activeScenarioId}
        errorMessage={scenariosErrorMessage}
        onRetry={handleScenarioRetry}
        onSelectScenario={handleScenarioSelect}
        scenarios={scenarioTemplates}
        status={scenariosStatus}
      />;
    }

    if (layout.activeLeftPanel === "worldbuilding") {
      return <WorldbuildingPanel
        entries={worldbuildingEntries}
        errorMessage={worldbuildingErrorMessage}
        onCreateEntry={handleCreateWorldbuildingEntry}
        onQueryChange={setWorldbuildingQuery}
        onRetry={triggerWorldbuildingReload}
        onTabChange={setWorldbuildingTab}
        query={worldbuildingQuery}
        status={worldbuildingStatus}
        tab={worldbuildingTab}
      />;
    }

    if (layout.activeLeftPanel === "knowledgeGraph") {
      return <KnowledgeGraphPanel
        edges={knowledgeGraphEdges}
        errorMessage={knowledgeGraphErrorMessage}
        noticeMessage={knowledgeGraphNoticeMessage}
        nodes={knowledgeGraphNodes}
        onQueryChange={setKnowledgeGraphQuery}
        onRetry={triggerKnowledgeGraphReload}
        onViewChange={setKnowledgeGraphView}
        query={knowledgeGraphQuery}
        status={knowledgeGraphStatus}
        view={knowledgeGraphView}
      />;
    }

    if (layout.activeLeftPanel === "memory") {
      return <MemoryPanel
        entries={memoryEntries}
        errorMessage={memoryErrorMessage}
        onQueryChange={setMemoryQuery}
        onRetry={triggerMemoryReload}
        query={memoryQuery}
        status={memoryStatus}
      />;
    }

    if (layout.activeLeftPanel === "characters") {
      return <div className="sidebar-surface">
        <div className="panel-section">
          <h1 className="screen-title">{t(`sidebar.${layout.activeLeftPanel}.title`)}</h1>
          <p className="panel-subtitle">{t(`sidebar.${layout.activeLeftPanel}.subtitle`)}</p>
        </div>
        <div className="sidebar-quick-tools">
          {QUICK_TOOL_ITEMS.map((toolKey) => (
            <button
              key={toolKey}
              type="button"
              className="sidebar-quick-tools__item"
              onClick={() => {
                if (toolKey === "sidebar.quickTools.search") {
                  layout.setActiveLeftPanel("search");
                  return;
                }
                if (toolKey === "sidebar.quickTools.tree") {
                  layout.setActiveLeftPanel("knowledgeGraph");
                  return;
                }
                if (toolKey === "sidebar.quickTools.conflict") {
                  layout.handleRightPanelSelect("quality");
                  return;
                }
                if (toolKey === "sidebar.quickTools.export") {
                  openExportModal("export");
                }
              }}
            >
              {t(toolKey)}
            </button>
          ))}
        </div>
        <div className="sidebar-summary-card">
          <p className="sidebar-label">{t("sidebar.quickTools.summary")}</p>
          <p className="panel-meta">{t(`sidebar.${layout.activeLeftPanel}.state`)}</p>
        </div>
      </div>;
    }

    if (layout.activeLeftPanel === "versionHistory") {
      return <VersionHistoryPanel
        errorMessage={versionHistory.errorMessage}
        items={versionHistory.items}
        onRefresh={() => {
          void versionHistory.refresh();
        }}
        onSelectVersion={(versionId) => {
          void versionHistory.selectVersion(versionId).then((snapshot) => {
            if (snapshot !== null) {
              startVersionPreview(snapshot);
            }
          });
        }}
        previewStatus={versionHistory.previewStatus}
        selectedSnapshot={versionHistory.selectedSnapshot}
        selectedVersionId={versionHistory.selectedVersionId}
        status={versionHistory.status}
      />;
    }

    if (layout.activeLeftPanel === "settings") {
      return <div className="sidebar-surface settings-surface">
        <div className="settings-surface__actions">
          <Button tone="secondary" onClick={() => setSettingsModalOpen(true)} data-testid="settings-open-modal-btn">
            {t("settingsModal.open")}
          </Button>
        </div>
        <SettingsPage />
      </div>;
    }

    const surfaceKey = `sidebar.${layout.activeLeftPanel}`;
    return <div className="sidebar-surface">
      <div className="panel-section">
        <h1 className="screen-title">{t(`${surfaceKey}.title`)}</h1>
        <p className="panel-subtitle">{t(`${surfaceKey}.subtitle`)}</p>
      </div>
      <dl className="details-grid">
        <div className="details-row">
          <dt>{t("panel.info.document")}</dt>
          <dd>{activeDocument?.title ?? t("document.defaultTitle")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.info.wordCount")}</dt>
          <dd>{t("status.wordCount", { count: wordCount })}</dd>
        </div>
        <div className="details-row">
          <dt>{t("sidebar.surfaceState")}</dt>
          <dd>{t(`${surfaceKey}.state`)}</dd>
        </div>
      </dl>
    </div>;
  };

  const renderRightPanelContent = () => {
    if (layout.activeRightPanel === "ai") {
      const isGeneratingPreview = aiSkill.currentOperation === "generate";
      const streamError = autosave.errorMessage !== null
        && autosave.errorMessageSourceRef.current === "general"
        && aiSkill.currentOperation === null
        && aiSkill.lastOperation === "generate"
        && preview === null;

      return <AiPreviewSurface
        activeSkill={aiSkill.activeSkill}
        busy={aiSkill.busy || isVersionPreviewActive}
        errorMessage={autosave.errorMessage}
        generating={isGeneratingPreview}
        generateDisabled={aiSkill.activeSkill === "builtin:continue" ? continueReady === false : stickySelection === null}
        instruction={aiSkill.instruction}
        instructionHint={instructionHint}
        model={aiSkill.model}
        onAccept={() => void aiSkill.handleAcceptPreview()}
        onClearReference={clearReference}
        onGenerate={() => void aiSkill.handleGeneratePreview()}
        onInstructionChange={aiSkill.setInstruction}
        onModelChange={aiSkill.setModel}
        onReject={() => void aiSkill.handleRejectPreview()}
        onSkillChange={aiSkill.selectAiSkill}
        preview={preview}
        reference={stickySelection}
        streamError={streamError}
      />;
    }

    if (layout.activeRightPanel === "info") {
      return <InfoPanelSurface
        documentTitle={activeDocument?.title ?? null}
        errorMessage={autosave.errorMessage}
        loading={bootstrapStatus !== "ready"}
        projectName={project?.name ?? null}
        statusLabel={saveLabel}
        updatedAt={formatTimestamp(autosave.lastSavedAt)}
        wordCount={wordCount}
      />;
    }

    return <section className="panel-surface" aria-label={t("tabs.quality")}>
      <header className="panel-section">
        <div>
          <h2 className="panel-title">{t("tabs.quality")}</h2>
          <p className="panel-subtitle">{t("panel.quality.subtitle")}</p>
        </div>
      </header>
      <dl className="details-grid">
        <div className="details-row">
          <dt>{t("panel.quality.selection")}</dt>
          <dd>{stickySelection ? truncateReference(stickySelection.text) : t("panel.quality.selectionEmpty")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.preview")}</dt>
          <dd>{preview ? t("panel.quality.previewReady") : t("panel.quality.previewIdle")}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.saveState")}</dt>
          <dd>{saveLabel}</dd>
        </div>
        <div className="details-row">
          <dt>{t("panel.quality.wordCount")}</dt>
          <dd>{t("status.wordCount", { count: wordCount })}</dd>
        </div>
      </dl>
    </section>;
  };

  if (bootstrapStatus === "loading") {
    return <>
      <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">{t("bootstrap.loading")}</main>
    </>;
  }

  if (bootstrapStatus === "error") {
    return <>
      <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
      <main className="workbench-shell workbench-shell--state">
        <h1 className="screen-title">{t("bootstrap.errorTitle")}</h1>
        {autosave.errorMessage ? <p className="panel-error">{autosave.errorMessage}</p> : null}
        <Button tone="primary" onClick={() => window.location.reload()}>{t("actions.reload")}</Button>
      </main>
    </>;
  }

  return <>
    <ToastIntegrationBridge autosaveEvent={autosave.autosaveToastEvent} retryLastAutosave={autosave.retryLastAutosave} />
    <main className="workbench-shell">
    <div
      className={[
        "workbench-frame",
        layout.dragState !== null && "workbench-frame--resizing",
        layout.zenMode && "workbench-frame--zen",
      ].filter(Boolean).join(" ")}
      data-testid="workbench-frame"
      data-export-active={exportProgress.isExporting ? "true" : undefined}
      style={frameStyle}
    >
      <AnimatePresence initial={false}>
        {layout.zenMode ? null : <motion.aside
          key="icon-rail"
          initial={{ x: -48 }}
          animate={{ x: 0 }}
          exit={{ x: -48 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
          className="icon-rail"
          aria-label={t("app.title")}
        >
          <div className="icon-rail__group">
            {LEFT_PANEL_ITEMS.filter((item) => item.placement === "top").map((item) => {
              const Icon = item.icon;
              return <Button
                key={item.id}
                className={layout.activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
                tone="ghost"
                aria-label={t(item.labelKey)}
                aria-pressed={layout.activeLeftPanel === item.id && layout.sidebarCollapsed === false}
                onClick={() => layout.handleLeftPanelSelect(item.id)}
              >
                <Icon size={ICON_SIZE} />
                <span className="rail-button__tooltip">{t(item.labelKey)}</span>
              </Button>;
            })}
          </div>
          <div className="icon-rail__group icon-rail__group--bottom">
            {LEFT_PANEL_ITEMS.filter((item) => item.placement === "bottom").map((item) => {
              const Icon = item.icon;
              return <Button
                key={item.id}
                className={layout.activeLeftPanel === item.id ? "rail-button rail-button--active" : "rail-button"}
                tone="ghost"
                aria-label={t(item.labelKey)}
                aria-pressed={layout.activeLeftPanel === item.id && layout.sidebarCollapsed === false}
                onClick={() => layout.handleLeftPanelSelect(item.id)}
              >
                <Icon size={ICON_SIZE} />
                <span className="rail-button__tooltip">{t(item.labelKey)}</span>
              </Button>;
            })}
          </div>
        </motion.aside>}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {layout.sidebarCollapsed || layout.zenMode ? null : <motion.aside
          key="left-sidebar"
          className="sidebar"
          aria-label={t("sidebar.title")}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: layout.sidebarWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          {renderSidebarContent()}
        </motion.aside>}
      </AnimatePresence>

      {layout.sidebarCollapsed ? null : <div
        className={layout.dragState?.panel === "left" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        hidden={layout.zenMode}
        inert={layout.zenMode ? "" : undefined}
        role="separator"
        aria-label={t("sidebar.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => layout.setSidebarWidth(LEFT_SIDEBAR_BOUNDS.defaultWidth)}
        onMouseDown={layout.startResize("left")}
      />}

      <section className="editor-column">
        <header className="editor-header">
          <div>
            <h2 className="screen-title">{activeDocument?.title ?? t("document.defaultTitle")}</h2>
            <p className="panel-meta">{selectionHint}</p>
          </div>
          {layout.zenMode ? null : <div className="editor-header__capsule-wrap">
            <div className="editor-header__capsule" role="group" aria-label={t("editor.capsule.label")}>
              <button className="editor-capsule-btn editor-capsule-btn--left" type="button" onClick={() => setProjectMenuOpen((open) => !open)}>
                <span>{t("editor.capsule.project", { project: project?.name ?? t("project.defaultName") })}</span>
                <ChevronDown size={14} aria-hidden="true" className={projectMenuOpen ? "sidebar-chevron sidebar-chevron--open" : "sidebar-chevron"} />
              </button>
              <button className="editor-capsule-btn editor-capsule-btn--right" type="button" onClick={() => setScenarioMenuOpen((open) => !open)}>
                <BookOpen size={14} aria-hidden="true" />
                <span>{t(activeScenario.labelKey)}</span>
                <ChevronDown size={14} aria-hidden="true" className={scenarioMenuOpen ? "sidebar-chevron sidebar-chevron--open" : "sidebar-chevron"} />
              </button>
            </div>
            <AnimatePresence>
              {projectMenuOpen ? <motion.div
                className="editor-capsule-menu editor-capsule-menu--left"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              >
                <button className="editor-capsule-menu__item" type="button" onClick={() => setProjectMenuOpen(false)}>
                  {project?.name ?? t("project.defaultName")}
                </button>
              </motion.div> : null}
            </AnimatePresence>
            <AnimatePresence>
              {scenarioMenuOpen ? <motion.div
                className="editor-capsule-menu editor-capsule-menu--right"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              >
                {SCENARIO_ITEMS.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={activeScenarioId === scenario.id ? "editor-capsule-menu__item editor-capsule-menu__item--active" : "editor-capsule-menu__item"}
                    type="button"
                    onClick={() => {
                      setActiveScenarioId(scenario.id);
                      setScenarioMenuOpen(false);
                    }}
                  >
                    {t(scenario.labelKey)}
                  </button>
                ))}
              </motion.div> : null}
            </AnimatePresence>
          </div>}
          <div className="editor-header__actions">
            <Button
              tone="ghost"
              className="zen-toggle"
              aria-label={layout.zenMode ? t("zenMode.exit") : t("zenMode.enter")}
              aria-pressed={layout.zenMode}
              onClick={layout.toggleZenMode}
              title={`${layout.zenMode ? t("zenMode.exit") : t("zenMode.enter")} (Shift+Z)`}
            >
              {layout.zenMode ? <Minimize2 size={ICON_SIZE} /> : <Maximize2 size={ICON_SIZE} />}
            </Button>
            {!layout.zenMode && layout.rightPanelCollapsed ? (
              <Button tone="ghost" disabled={isVersionPreviewActive} onClick={() => layout.handleRightPanelSelect("ai")}>{t("panel.actions.openAi")}</Button>
            ) : null}
          </div>
        </header>
        {versionPreviewSnapshot !== null && previewBannerLabel !== null ? <div className="version-preview-banner" role="status" aria-live="polite">
          <div className="version-preview-banner__copy">
            <p className="version-preview-banner__title">{previewBannerLabel}</p>
            <p className="version-preview-banner__subtitle">{t("versionHistory.previewReadonlyHint")}</p>
          </div>
          <div className="panel-actions">
            <Button
              tone="primary"
              disabled={versionHistory.action !== null}
              onClick={handleRequestVersionRestore}
            >
              {versionHistory.action === "restore" ? t("versionHistory.restoring") : t("versionHistory.restoreToThisVersion")}
            </Button>
            <Button tone="ghost" onClick={handleReturnToCurrentVersion}>{t("versionHistory.returnToCurrentVersion")}</Button>
          </div>
        </div> : null}
        <div className="editor-scroll">
          <div ref={containerRef} className={versionPreviewSnapshot === null ? "editor-host" : "editor-host editor-host--readonly"} />
        </div>
        <EditorSelectionToolbar
          anchor={selectionToolbarAnchor}
          busy={aiSkill.busy || isVersionPreviewActive}
          defaultPromptOpen={false}
          onChangeTone={handleToolbarChangeTone}
          onFixGrammar={handleToolbarFixGrammar}
          onPolish={handleToolbarPolish}
          onPromptOpenChange={setSelectionToolbarPromptOpen}
          onSubmitInstruction={handleToolbarSubmitInstruction}
          resetKey={selectionToolbarResetKey}
          visible={bootstrapStatus === "ready" && preview === null && isVersionPreviewActive === false}
        />
      </section>

      {layout.rightPanelCollapsed ? null : <div
        className={layout.dragState?.panel === "right" ? "panel-resizer panel-resizer--dragging" : "panel-resizer"}
        hidden={layout.zenMode}
        inert={layout.zenMode ? "" : undefined}
        role="separator"
        aria-label={t("panel.resizeHandle")}
        aria-orientation="vertical"
        onDoubleClick={() => layout.setRightPanelWidth(RIGHT_PANEL_BOUNDS.defaultWidth)}
        onMouseDown={layout.startResize("right")}
      />}

      {layout.rightPanelCollapsed ? null : <aside className="right-panel" hidden={layout.zenMode} inert={layout.zenMode ? "" : undefined} aria-label={t("panel.title")}>
        <div className="right-tabs">
          <div className="right-tabs__list" role="tablist" aria-label={t("panel.tabs")}>
            {RIGHT_PANEL_IDS.map((panelId) => (
              <Button
                key={panelId}
                tone="ghost"
                role="tab"
                className={layout.activeRightPanel === panelId ? "right-tab right-tab--active" : "right-tab"}
                aria-selected={layout.activeRightPanel === panelId}
                onClick={() => layout.handleRightPanelSelect(panelId)}
              >
                {t(`tabs.${panelId}`)}
              </Button>
            ))}
          </div>
          <div className="right-tabs__actions">
            {layout.activeRightPanel === "ai" ? <>
              <Button tone="ghost" className="right-action" onClick={() => undefined}>{t("panel.ai.history")}</Button>
              <Button tone="ghost" className="right-action" onClick={aiSkill.resetAiConversation}>{t("panel.ai.newChat")}</Button>
            </> : null}
            <Button tone="ghost" className="right-action" aria-label={t("panel.actions.collapse")} onClick={layout.handleToggleRightPanel}>
              <ChevronLeft size={16} />
            </Button>
          </div>
        </div>
        {renderRightPanelContent()}
      </aside>}
    </div>

    <AnimatePresence>
      {layout.rightPanelCollapsed && !layout.zenMode ? <motion.button
        key="panel-fab"
        className="workbench-fab"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={() => layout.handleRightPanelSelect("ai")}
        type="button"
      >
        <MessageSquare size={20} />
        <span className="workbench-fab__tooltip">{t("panel.fabTooltip")}</span>
      </motion.button> : null}
    </AnimatePresence>

    <AnimatePresence>
      {layout.zenMode ? <>
        <motion.div
          key="zen-dot"
          className="zen-dot-toolbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={zenDotExpanded ? "zen-dot-toolbar__shell zen-dot-toolbar__shell--expanded" : "zen-dot-toolbar__shell"}>
            <button className={zenDotExpanded ? "zen-dot-toolbar__trigger zen-dot-toolbar__trigger--expanded" : "zen-dot-toolbar__trigger"} onClick={() => setZenDotExpanded((expanded) => !expanded)} type="button" aria-label={t("zenMode.toolbarToggle")}/>
            <AnimatePresence>
              {zenDotExpanded ? <motion.div
                className="zen-dot-toolbar__panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
              >
                <button type="button" className="zen-dot-toolbar__button" onClick={layout.toggleZenMode} aria-label={t("zenMode.exit")}>
                  <Minimize2 size={14} />
                </button>
                <button type="button" className="zen-dot-toolbar__button" aria-label={t("zenMode.bold")}>
                  <Bold size={13} />
                </button>
                <button type="button" className="zen-dot-toolbar__button" aria-label={t("zenMode.italic")}>
                  <Italic size={13} />
                </button>
                <button type="button" className="zen-dot-toolbar__button" aria-label={t("zenMode.type")}>
                  <Type size={13} />
                </button>
                <button type="button" className="zen-dot-toolbar__button" aria-label={t("iconBar.search")}>
                  <Search size={13} />
                </button>
                <button type="button" className="zen-dot-toolbar__button" onClick={() => layout.handleLeftPanelSelect("files")} aria-label={t("iconBar.files")}>
                  <Files size={13} />
                </button>
              </motion.div> : null}
            </AnimatePresence>
          </div>
        </motion.div>
        <motion.div
          key="zen-input"
          className="zen-capsule-input-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
        >
          <motion.div
            className="zen-capsule-input"
            onMouseEnter={() => setZenCapsuleHovered(true)}
            onMouseLeave={() => setZenCapsuleHovered(false)}
            animate={{ opacity: zenCapsuleHovered ? 1 : 0.08 }}
            transition={{ duration: 0.2 }}
          >
            <MessageSquare size={14} />
            <input readOnly value={t("zenMode.aiPlaceholder")} aria-label={t("zenMode.aiPlaceholder")} />
          </motion.div>
        </motion.div>
      </> : null}
    </AnimatePresence>

    <CommandPalette
      emptyLabel={t("commandPalette.empty")}
      groupLabels={{
        actions: t("commandPalette.group.actions"),
        documents: t("commandPalette.group.documents"),
        navigation: t("commandPalette.group.navigation"),
        scenarios: t("commandPalette.group.scenarios"),
      }}
      items={commandPaletteItems}
      onClose={() => setCommandPaletteOpen(false)}
      onQueryChange={setCommandPaletteQuery}
      onSelect={handleCommandPaletteSelect}
      open={commandPaletteOpen && restoreDialogSnapshot === null}
      placeholder={t("commandPalette.placeholder")}
      query={commandPaletteQuery}
      shortcutHint={t("commandPalette.shortcutHint")}
      title={t("commandPalette.title")}
    />

    <ExportPublishModal
      errorMessage={exportErrorMessage}
      exporting={exporting}
      isOpen={exportModalOpen}
      mode={exportModalMode}
      onClose={() => setExportModalOpen(false)}
      onExport={(format) => {
        void handleExportDocument(format);
      }}
      onModeChange={setExportModalMode}
      resultPath={exportResultPath}
    />

    <SettingsModal
      isOpen={settingsModalOpen}
      onClose={() => setSettingsModalOpen(false)}
    />

    {restoreDialogSnapshot === null ? null : <div className="version-restore-dialog-backdrop">
      <section className="version-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="version-restore-dialog-title">
        <div className="panel-section">
          <h2 id="version-restore-dialog-title" className="panel-title">{t("versionHistory.restoreDialogTitle")}</h2>
          <p className="panel-subtitle">{t("versionHistory.restoreDialogDescription", {
            timestamp: formatTimestamp(restoreDialogSnapshot.createdAt),
          })}</p>
        </div>
        <div className="panel-actions">
          <Button tone="ghost" onClick={() => setRestoreDialogSnapshot(null)}>{t("actions.cancel")}</Button>
          <Button tone="danger" onClick={() => void handleVersionHistoryRestore()}>{t("versionHistory.confirmRestore")}</Button>
        </div>
      </section>
    </div>}

    <footer className="status-bar" hidden={layout.zenMode} inert={layout.zenMode ? "" : undefined}>
      <span className="status-bar__group">{t("status.wordCount", { count: wordCount })}</span>
      <span className="status-bar__separator">|</span>
      <span className="status-bar__group">{t("status.creativeDuration", { duration: writingDurationLabel })}</span>
      <span className="status-bar__separator">|</span>
      <span className="status-bar__group status-bar__sync">
        <span className="status-bar__sync-dot" aria-hidden="true" />
        {t("status.cloudSyncing")}
      </span>
      <Button className="status-bar__group status-bar__action status-bar__legacy" tone="ghost" onClick={handleStatusBarAction}>
        {saveLabel}
      </Button>
      <span className="status-bar__group status-bar__legacy">{formatTimestamp(autosave.lastSavedAt)}</span>
    </footer>
    </main>
  </>;
}
