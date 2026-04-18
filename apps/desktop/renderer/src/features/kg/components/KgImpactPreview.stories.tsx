import type { Meta, StoryObj } from "@storybook/react";

import { KgImpactPreview, type KgImpactPreviewPayload } from "./KgImpactPreview";

const meta: Meta<typeof KgImpactPreview> = {
  title: "Features/KG/KgImpactPreview",
  component: KgImpactPreview,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof KgImpactPreview>;

const baseEntity = {
  id: "entity-1",
  name: "林远",
  type: "character",
} as const;

function makeRelations(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: "rel-" + index,
    direction: (index % 2 === 0 ? "incoming" : "outgoing") as
      | "incoming"
      | "outgoing",
    relationType: ["认识", "同事", "对手", "导师"][index % 4],
    otherEntityId: "other-" + index,
    otherEntityName:
      ["苏瑾", "陈叙", "第七部", "顾言", "云深宗", "裴洛"][index] ??
      "实体 " + index,
    otherEntityType: "character" as string | null,
  }));
}

const lowPreview: KgImpactPreviewPayload = {
  entity: baseEntity,
  severity: "low",
  incomingRelations: makeRelations(1).filter((r) => r.direction === "incoming"),
  outgoingRelations: [],
  affectedForeshadows: [],
  totalRelationCount: 1,
  unresolvedForeshadowCount: 0,
  requiresTypedConfirmation: false,
  queryCostMs: 12,
  revisionFingerprint: "e=1:2026-01-01;r=1:2026-01-01",
};

const midPreview: KgImpactPreviewPayload = {
  entity: baseEntity,
  severity: "mid",
  incomingRelations: makeRelations(2).slice(0, 1),
  outgoingRelations: makeRelations(3).slice(1),
  affectedForeshadows: [],
  totalRelationCount: 3,
  unresolvedForeshadowCount: 0,
  requiresTypedConfirmation: false,
  queryCostMs: 18,
  revisionFingerprint: "e=3:2026-01-02;r=3:2026-01-02",
};

const criticalPreview: KgImpactPreviewPayload = {
  entity: baseEntity,
  severity: "critical",
  incomingRelations: makeRelations(6).filter((r) => r.direction === "incoming"),
  outgoingRelations: makeRelations(6).filter((r) => r.direction === "outgoing"),
  affectedForeshadows: [
    { id: "fs-1", name: "林远的身世之谜" },
    { id: "fs-2", name: "十年前的旧案" },
    { id: "fs-3", name: "云深宗的禁地" },
  ],
  totalRelationCount: 12,
  unresolvedForeshadowCount: 3,
  requiresTypedConfirmation: true,
  queryCostMs: 24,
  revisionFingerprint: "e=12:2026-01-03;r=12:2026-01-03",
};

export const Low: Story = {
  args: {
    open: true,
    preview: lowPreview,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Mid: Story = {
  args: {
    open: true,
    preview: midPreview,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Critical: Story = {
  args: {
    open: true,
    preview: criticalPreview,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Loading: Story = {
  args: {
    open: true,
    preview: null,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Error: Story = {
  args: {
    open: true,
    preview: null,
    errorMessage: "无法加载影响预览，已为你保留原稿。",
    onConfirm: () => {},
    onCancel: () => {},
  },
};
