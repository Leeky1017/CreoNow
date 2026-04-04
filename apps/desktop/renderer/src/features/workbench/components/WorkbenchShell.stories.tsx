import {
  Brain,
  ChevronLeft,
  FolderTree,
  History,
  ListTree,
  Network,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";

const leftItems = [
  { id: "files", icon: FolderTree, labelKey: "iconBar.files", placement: "top" },
  { id: "search", icon: Search, labelKey: "iconBar.search", placement: "top" },
  { id: "outline", icon: ListTree, labelKey: "iconBar.outline", placement: "top" },
  { id: "versionHistory", icon: History, labelKey: "iconBar.versionHistory", placement: "top" },
  { id: "memory", icon: Brain, labelKey: "iconBar.memory", placement: "top" },
  { id: "characters", icon: Users, labelKey: "iconBar.characters", placement: "top" },
  { id: "knowledgeGraph", icon: Network, labelKey: "iconBar.knowledgeGraph", placement: "top" },
  { id: "settings", icon: Settings, labelKey: "iconBar.settings", placement: "bottom" },
] as const;

type WorkbenchShellStoryProps = {
  activeLeftPanel: string;
  activeRightPanel: "ai" | "info" | "quality";
  rightPanelCollapsed: boolean;
  rightPanelWidth: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
};

function WorkbenchShellStory(args: WorkbenchShellStoryProps) {
  const { t } = useTranslation();

  return <main className="workbench-shell">
    <div
      className="workbench-frame"
      style={{
        "--left-resizer-width": args.sidebarCollapsed ? "0px" : "8px",
        "--left-sidebar-width": args.sidebarCollapsed ? "0px" : `${args.sidebarWidth}px`,
        "--right-panel-width": args.rightPanelCollapsed ? "0px" : `${args.rightPanelWidth}px`,
        "--right-resizer-width": args.rightPanelCollapsed ? "0px" : "8px",
      } as CSSProperties}
    >
      <aside className="icon-rail" aria-label={t("app.title")}>
        <div className="icon-rail__group">
          {leftItems.filter((item) => item.placement === "top").map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} tone="ghost" className={item.id === args.activeLeftPanel ? "rail-button rail-button--active" : "rail-button"} aria-label={t(item.labelKey)}>
              <Icon size={18} />
            </Button>;
          })}
        </div>
        <div className="icon-rail__group icon-rail__group--bottom">
          {leftItems.filter((item) => item.placement === "bottom").map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} tone="ghost" className={item.id === args.activeLeftPanel ? "rail-button rail-button--active" : "rail-button"} aria-label={t(item.labelKey)}>
              <Icon size={18} />
            </Button>;
          })}
        </div>
      </aside>

      {args.sidebarCollapsed ? null : <aside className="sidebar" aria-label={t("sidebar.title")}>
        {args.activeLeftPanel === "versionHistory" ? <div className="sidebar-surface">
          <div className="panel-section">
            <h1 className="screen-title">{t("sidebar.versionHistory.title")}</h1>
            <p className="panel-subtitle">{t("sidebar.versionHistory.subtitle")}</p>
          </div>
          <dl className="details-grid">
            <div className="details-row">
              <dt>{t("panel.info.document")}</dt>
              <dd>{t("document.defaultTitle")}</dd>
            </div>
            <div className="details-row">
              <dt>{t("sidebar.versionHistory.parentLabel")}</dt>
              <dd>{t("sidebar.versionHistory.parentValue", { parent: "version-pre-write" })}</dd>
            </div>
          </dl>
          <div className="panel-section">
            <div className="details-grid">
              <div className="details-row">
                <dt>{t("sidebar.versionHistory.reason.ai-accept")}</dt>
                <dd>01/04 20:18</dd>
              </div>
              <div className="details-row">
                <dt>{t("sidebar.versionHistory.actorLabel")}</dt>
                <dd>{t("sidebar.versionHistory.actor.ai")}</dd>
              </div>
              <Button tone="ghost">{t("sidebar.versionHistory.rollbackLabel", { reason: t("sidebar.versionHistory.reason.ai-accept") })}</Button>
            </div>
          </div>
        </div> : <>
          <div className="sidebar-header">
            <div>
              <h1 className="screen-title">{t("project.defaultName")}</h1>
              <p className="panel-subtitle">{t("sidebar.files.subtitle")}</p>
            </div>
            <Button tone="ghost">{t("sidebar.newDocument")}</Button>
          </div>
          <div className="sidebar-list">
            <Button tone="ghost" className="sidebar-item sidebar-item--active">
              <span className="sidebar-item__title">{t("document.defaultTitle")}</span>
              <span className="sidebar-item__meta">01/01 12:00</span>
            </Button>
            <Button tone="ghost" className="sidebar-item">
              <span className="sidebar-item__title">{`${t("document.defaultTitle")} 2`}</span>
              <span className="sidebar-item__meta">01/02 08:30</span>
            </Button>
          </div>
        </>}
      </aside>}

      {args.sidebarCollapsed ? null : <div className="panel-resizer" role="separator" aria-label={t("sidebar.resizeHandle")} aria-orientation="vertical" />}

      <section className="editor-column">
        <header className="editor-header">
          <div>
            <h2 className="screen-title">{t("document.defaultTitle")}</h2>
            <p className="panel-meta">{t("editor.selectionHint")}</p>
          </div>
          {args.rightPanelCollapsed ? <Button tone="ghost">{t("panel.actions.openAi")}</Button> : null}
        </header>
        <div className="editor-scroll">
          <div className="editor-host">
            <div className="cn-editor-surface">{`${t("document.defaultTitle")} · ${t("panel.ai.subtitle")}`}</div>
          </div>
        </div>
      </section>

      {args.rightPanelCollapsed ? null : <div className="panel-resizer" role="separator" aria-label={t("panel.resizeHandle")} aria-orientation="vertical" />}

      {args.rightPanelCollapsed ? null : <aside className="right-panel" aria-label={t("panel.title")}>
        <div className="right-tabs">
          <div className="right-tabs__list" role="tablist" aria-label={t("panel.tabs")}>
            {(["ai", "info", "quality"] as const).map((panelId) => (
              <Button key={panelId} tone="ghost" role="tab" className={panelId === args.activeRightPanel ? "right-tab right-tab--active" : "right-tab"} aria-selected={panelId === args.activeRightPanel}>
                {t(`tabs.${panelId}`)}
              </Button>
            ))}
          </div>
          <div className="right-tabs__actions">
            {args.activeRightPanel === "ai" ? <>
              <Button tone="ghost" className="right-action">{t("panel.ai.history")}</Button>
              <Button tone="ghost" className="right-action">{t("panel.ai.newChat")}</Button>
            </> : null}
            <Button tone="ghost" className="right-action" aria-label={t("panel.actions.collapse")}><ChevronLeft size={16} /></Button>
          </div>
        </div>
        {args.activeRightPanel === "info"
          ? <InfoPanelSurface documentTitle={t("document.defaultTitle")} errorMessage={null} loading={false} projectName={t("project.defaultName")} statusLabel={t("status.saved")} updatedAt="01/01 12:00" wordCount={128} />
          : <section className="panel-surface">
              <header className="panel-section">
                <div>
                  <h2 className="panel-title">{t(`tabs.${args.activeRightPanel}`)}</h2>
                  <p className="panel-subtitle">{args.activeRightPanel === "ai" ? t("panel.ai.subtitle") : t("panel.quality.subtitle")}</p>
                </div>
              </header>
              <dl className="details-grid">
                <div className="details-row">
                  <dt>{t("panel.info.document")}</dt>
                  <dd>{t("document.defaultTitle")}</dd>
                </div>
                <div className="details-row">
                  <dt>{t("panel.info.wordCount")}</dt>
                  <dd>{t("status.wordCount", { count: 128 })}</dd>
                </div>
              </dl>
            </section>}
      </aside>}
    </div>
    <footer className="status-bar">
      <span className="status-bar__group">{t("status.projectDocument", { project: t("project.defaultName"), document: t("document.defaultTitle") })}</span>
      <span className="status-bar__group">{t("status.wordCount", { count: 128 })}</span>
      <span className="status-bar__group">{t("status.saved")}</span>
      <span className="status-bar__group">01/01 12:00</span>
    </footer>
  </main>;
}

const meta = {
  title: "Workbench/Shell",
  render: (args) => <WorkbenchShellStory {...args} />,
  args: {
    activeLeftPanel: "files",
    activeRightPanel: "ai",
    rightPanelCollapsed: false,
    rightPanelWidth: 320,
    sidebarCollapsed: false,
    sidebarWidth: 240,
  },
} satisfies Meta<WorkbenchShellStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SidebarCollapsed: Story = {
  args: {
    sidebarCollapsed: true,
  },
};

export const RightPanelCollapsed: Story = {
  args: {
    rightPanelCollapsed: true,
  },
};

export const BothCollapsed: Story = {
  args: {
    rightPanelCollapsed: true,
    sidebarCollapsed: true,
  },
};

export const InfoPanel: Story = {
  args: {
    activeRightPanel: "info",
  },
};

export const QualityPanel: Story = {
  args: {
    activeRightPanel: "quality",
  },
};

export const ResizedPanels: Story = {
  args: {
    activeLeftPanel: "knowledgeGraph",
    activeRightPanel: "info",
    rightPanelWidth: 420,
    sidebarWidth: 320,
  },
};
export const VersionHistoryPanel: Story = {
  args: {
    activeLeftPanel: "versionHistory",
  },
};
