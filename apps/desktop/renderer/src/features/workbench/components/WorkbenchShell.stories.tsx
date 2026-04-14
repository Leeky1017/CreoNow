import {
  Brain,
  Calendar,
  ChevronLeft,
  Files,
  Globe,
  Layers,
  LayoutDashboard,
  Maximize2,
  Minimize2,
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

const ICON_SIZE = 20;

const leftItems = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "iconBar.dashboard", placement: "top" },
  { id: "search", icon: Search, labelKey: "iconBar.search", placement: "top" },
  { id: "calendar", icon: Calendar, labelKey: "iconBar.calendar", placement: "top" },
  { id: "files", icon: Files, labelKey: "iconBar.files", placement: "top" },
  { id: "scenarios", icon: Layers, labelKey: "iconBar.scenarios", placement: "top" },
  { id: "characters", icon: Users, labelKey: "iconBar.characters", placement: "top" },
  { id: "worldbuilding", icon: Globe, labelKey: "iconBar.worldbuilding", placement: "top" },
  { id: "knowledgeGraph", icon: Network, labelKey: "iconBar.knowledgeGraph", placement: "top" },
  { id: "memory", icon: Brain, labelKey: "iconBar.memory", placement: "top" },
  { id: "settings", icon: Settings, labelKey: "iconBar.settings", placement: "bottom" },
] as const;

type WorkbenchShellStoryProps = {
  activeLeftPanel: string;
  activeRightPanel: "ai" | "info" | "quality";
  rightPanelCollapsed: boolean;
  rightPanelWidth: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  zenMode: boolean;
};

function WorkbenchShellStory(args: WorkbenchShellStoryProps) {
  const { t } = useTranslation();
  const zenInertProps = args.zenMode ? { inert: "" as const } : {};

  return <main className="workbench-shell">
    <div
      className={["workbench-frame", args.zenMode && "workbench-frame--zen"].filter(Boolean).join(" ")}
      style={{
        "--icon-rail-width": args.zenMode ? "0px" : "48px",
        "--left-resizer-width": (args.zenMode || args.sidebarCollapsed) ? "0px" : "8px",
        "--left-sidebar-width": (args.zenMode || args.sidebarCollapsed) ? "0px" : `${args.sidebarWidth}px`,
        "--right-panel-width": (args.zenMode || args.rightPanelCollapsed) ? "0px" : `${args.rightPanelWidth}px`,
        "--right-resizer-width": (args.zenMode || args.rightPanelCollapsed) ? "0px" : "8px",
      } as CSSProperties}
    >
      <aside className="icon-rail" hidden={args.zenMode} {...zenInertProps} aria-label={t("app.title")}>
        <div className="icon-rail__group">
          {leftItems.filter((item) => item.placement === "top").map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} tone="ghost" className={item.id === args.activeLeftPanel ? "rail-button rail-button--active" : "rail-button"} aria-label={t(item.labelKey)}>
              <Icon size={ICON_SIZE} />
              <span className="rail-button__tooltip">{t(item.labelKey)}</span>
            </Button>;
          })}
        </div>
        <div className="icon-rail__group icon-rail__group--bottom">
          {leftItems.filter((item) => item.placement === "bottom").map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} tone="ghost" className={item.id === args.activeLeftPanel ? "rail-button rail-button--active" : "rail-button"} aria-label={t(item.labelKey)}>
              <Icon size={ICON_SIZE} />
              <span className="rail-button__tooltip">{t(item.labelKey)}</span>
            </Button>;
          })}
        </div>
      </aside>

      {args.sidebarCollapsed ? null : <aside className="sidebar" hidden={args.zenMode} {...zenInertProps} aria-label={t("sidebar.title")}>
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
      </aside>}

      {args.sidebarCollapsed ? null : <div className="panel-resizer" hidden={args.zenMode} {...zenInertProps} role="separator" aria-label={t("sidebar.resizeHandle")} aria-orientation="vertical" />}

      <section className="editor-column">
        <header className="editor-header">
          <div>
            <h2 className="screen-title">{t("document.defaultTitle")}</h2>
            <p className="panel-meta">{t("editor.selectionHint")}</p>
          </div>
          <div className="editor-header__actions">
            <Button tone="ghost" className="zen-toggle" aria-label={args.zenMode ? t("zenMode.exit") : t("zenMode.enter")} aria-pressed={args.zenMode} title={`${args.zenMode ? t("zenMode.exit") : t("zenMode.enter")} (Shift+Z)`}>
              {args.zenMode ? <Minimize2 size={ICON_SIZE} /> : <Maximize2 size={ICON_SIZE} />}
            </Button>
            {!args.zenMode && args.rightPanelCollapsed ? <Button tone="ghost">{t("panel.actions.openAi")}</Button> : null}
          </div>
        </header>
        <div className="editor-scroll">
          <div className="editor-host">
            <div className="cn-editor-surface">{`${t("document.defaultTitle")} · ${t("panel.ai.subtitle")}`}</div>
          </div>
        </div>
      </section>

      {args.rightPanelCollapsed ? null : <div className="panel-resizer" hidden={args.zenMode} {...zenInertProps} role="separator" aria-label={t("panel.resizeHandle")} aria-orientation="vertical" />}

      {args.rightPanelCollapsed ? null : <aside className="right-panel" hidden={args.zenMode} {...zenInertProps} aria-label={t("panel.title")}>
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
    <footer className="status-bar" hidden={args.zenMode} {...zenInertProps}>
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
    sidebarWidth: 260,
    zenMode: false,
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

export const ZenMode: Story = {
  args: {
    zenMode: true,
  },
};
