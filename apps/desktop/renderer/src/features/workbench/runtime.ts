import type { IpcError, IpcResponseData } from "@shared/types/ipc-generated";

import type { EditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import { RendererIpcError, type PreloadApi } from "@/lib/preloadApi";

export type ProjectListItem = IpcResponseData<"project:project:list">["items"][number];
export type DocumentListItem = IpcResponseData<"file:document:list">["items"][number];
export type DocumentRead = IpcResponseData<"file:document:read">;

export interface BootstrapLabels {
  defaultProjectName: string;
  defaultDocumentTitle: string;
}

export interface WorkspaceBootstrap {
  activeDocument: DocumentRead;
  documents: DocumentListItem[];
  project: ProjectListItem;
}

export interface WorkbenchContextToken {
  documentId: string;
  projectId: string;
  revision: number;
}

export interface AiPreview {
  context: WorkbenchContextToken;
  executionId: string;
  originalText: string;
  runId: string;
  selection: SelectionRef | null;
  skill: AiLauncherSkill;
  sourceUserEditRevision: number;
  suggestedText: string;
}

export type AiLauncherSkill = "polish" | "rewrite" | "continue";

export interface AcceptAiPreviewResult {
  feedbackError: Error | null;
  updatedAt: number;
}

function toAcceptConfirmationError(confirmResult: Awaited<ReturnType<PreloadApi["ai"]["confirmSkill"]>>): RendererIpcError {
  if (confirmResult.ok === false) {
    return new RendererIpcError(confirmResult.error);
  }

  return new RendererIpcError({
    code: "PERMISSION_DENIED",
    message: "AI preview confirmation was rejected",
  });
}

export type RunWithoutAutosave = <TResult>(operation: () => TResult) => TResult;
export type GetUserEditRevision = () => number;
export type GetEditorContextRevision = () => number;

export class SelectionChangedError extends Error {
  public constructor() {
    super("selection-changed");
    this.name = "SelectionChangedError";
  }
}

export class StaleAiPreviewError extends Error {
  public constructor() {
    super("ai-preview-stale");
    this.name = "StaleAiPreviewError";
  }
}

function isAcceptedPreviewConfirmation(
  confirmResult: Awaited<ReturnType<PreloadApi["ai"]["confirmSkill"]>>,
): boolean {
  return confirmResult.ok === true && confirmResult.data.status === "completed";
}

async function readConfirmedDocument(
  api: PreloadApi,
  context: WorkbenchContextToken,
): Promise<DocumentRead> {
  const readResult = await api.file.readDocument({
    projectId: context.projectId,
    documentId: context.documentId,
  });

  if (readResult.ok === false) {
    throw new RendererIpcError(readResult.error);
  }

  return readResult.data;
}

function toFeedbackError(error: IpcError | Error): Error {
  if ("code" in error) {
    return new RendererIpcError(error);
  }

  return error;
}

export async function bootstrapWorkspace(api: PreloadApi, labels: BootstrapLabels): Promise<WorkspaceBootstrap> {
  let projectsResult = await api.project.list({ includeArchived: false });
  if (projectsResult.ok === false) {
    throw projectsResult.error;
  }

  if (projectsResult.data.items.length === 0) {
    const createProject = await api.project.create({
      name: labels.defaultProjectName,
      type: "novel",
    });
    if (createProject.ok === false) {
      throw createProject.error;
    }

    const setCurrentProject = await api.project.setCurrent({
      projectId: createProject.data.projectId,
    });
    if (setCurrentProject.ok === false) {
      throw setCurrentProject.error;
    }

    projectsResult = await api.project.list({ includeArchived: false });
    if (projectsResult.ok === false) {
      throw projectsResult.error;
    }
  }

  const currentProjectResult = await api.project.getCurrent();
  const project = currentProjectResult.ok
    ? projectsResult.data.items.find((item: ProjectListItem) => item.projectId === currentProjectResult.data.projectId) ?? projectsResult.data.items[0]
    : projectsResult.data.items[0];

  if (project === undefined) {
    throw new Error("No project available after bootstrap");
  }

  if (currentProjectResult.ok === false || currentProjectResult.data.projectId !== project.projectId) {
    const setProject = await api.project.setCurrent({ projectId: project.projectId });
    if (setProject.ok === false) {
      throw setProject.error;
    }
  }

  let documentsResult = await api.file.listDocuments({ projectId: project.projectId });
  if (documentsResult.ok === false) {
    throw documentsResult.error;
  }

  let documentId: string | null = null;
  const currentDocumentResult = await api.file.getCurrentDocument({ projectId: project.projectId });
  if (currentDocumentResult.ok) {
    documentId = currentDocumentResult.data.documentId;
  }

  if (documentsResult.data.items.length === 0) {
    const createDocument = await api.file.createDocument({
      projectId: project.projectId,
      title: labels.defaultDocumentTitle,
      type: "chapter",
    });
    if (createDocument.ok === false) {
      throw createDocument.error;
    }

    documentId = createDocument.data.documentId;
    documentsResult = await api.file.listDocuments({ projectId: project.projectId });
    if (documentsResult.ok === false) {
      throw documentsResult.error;
    }
  }

  if (documentId === null) {
    documentId = documentsResult.data.items[0]?.documentId ?? null;
  }

  if (documentId === null) {
    throw new Error("No document available after bootstrap");
  }

  const setCurrentDocument = await api.file.setCurrentDocument({
    projectId: project.projectId,
    documentId,
  });
  if (setCurrentDocument.ok === false) {
    throw setCurrentDocument.error;
  }

  const readDocument = await api.file.readDocument({
    projectId: project.projectId,
    documentId,
  });
  if (readDocument.ok === false) {
    throw readDocument.error;
  }

  return {
    project,
    documents: documentsResult.data.items,
    activeDocument: readDocument.data,
  };
}

export async function createDocumentAndOpen(args: {
  api: PreloadApi;
  defaultDocumentTitle: string;
  projectId: string;
}): Promise<{ activeDocument: DocumentRead; documents: DocumentListItem[] }> {
  const createDocument = await args.api.file.createDocument({
    projectId: args.projectId,
    title: args.defaultDocumentTitle,
    type: "chapter",
  });
  if (createDocument.ok === false) {
    throw createDocument.error;
  }

  const setCurrent = await args.api.file.setCurrentDocument({
    projectId: args.projectId,
    documentId: createDocument.data.documentId,
  });
  if (setCurrent.ok === false) {
    throw setCurrent.error;
  }

  const [documentsResult, readResult] = await Promise.all([
    args.api.file.listDocuments({ projectId: args.projectId }),
    args.api.file.readDocument({
      projectId: args.projectId,
      documentId: createDocument.data.documentId,
    }),
  ]);

  if (documentsResult.ok === false) {
    throw documentsResult.error;
  }
  if (readResult.ok === false) {
    throw readResult.error;
  }

  return {
    activeDocument: readResult.data,
    documents: documentsResult.data.items,
  };
}

export async function openDocument(args: {
  api: PreloadApi;
  documentId: string;
  projectId: string;
}): Promise<DocumentRead> {
  const setCurrent = await args.api.file.setCurrentDocument({
    projectId: args.projectId,
    documentId: args.documentId,
  });
  if (setCurrent.ok === false) {
    throw setCurrent.error;
  }

  const readResult = await args.api.file.readDocument({
    projectId: args.projectId,
    documentId: args.documentId,
  });
  if (readResult.ok === false) {
    throw readResult.error;
  }

  return readResult.data;
}

export async function requestAiPreview(args: {
  api: PreloadApi;
  context: WorkbenchContextToken;
  cursorPosition?: number;
  instruction: string;
  model: string;
  precedingText?: string;
  selection?: SelectionRef;
  skill: AiLauncherSkill;
  userEditRevision: number;
}): Promise<AiPreview> {
  const instruction = args.instruction.trim();
  let originalText = "";
  let input = "";
  let skillId = "";
  let hasSelection = false;

  if (args.skill === "continue") {
    if (typeof args.cursorPosition !== "number" || args.precedingText === undefined || args.precedingText.trim().length === 0) {
      throw new Error("context-required");
    }
    originalText = args.precedingText;
    input = args.precedingText;
    skillId = "builtin:continue";
  } else {
    if (args.selection === undefined) {
      throw new Error("selection-required");
    }
    originalText = args.selection.text;
    hasSelection = true;

    if (args.skill === "rewrite") {
      if (instruction.length === 0) {
        throw new Error("instruction-required");
      }
      input = [
        "Instruction:",
        instruction,
        "",
        "Text:",
        args.selection.text,
      ].join(String.fromCharCode(10));
      skillId = "builtin:rewrite";
    } else {
      input = args.selection.text;
      skillId = "builtin:polish";
    }
  }

  const result = await args.api.ai.runSkill({
    skillId,
    hasSelection,
    ...(args.selection === undefined ? {} : { selection: args.selection }),
    ...(args.cursorPosition === undefined ? {} : { cursorPosition: args.cursorPosition }),
    ...(args.precedingText === undefined ? {} : { precedingText: args.precedingText }),
    input,
    mode: "ask",
    model: args.model,
    stream: false,
    context: {
      projectId: args.context.projectId,
      documentId: args.context.documentId,
    },
  });
  if (result.ok === false) {
    throw result.error;
  }

  const suggestedText = result.data.outputText ?? result.data.candidates?.[0]?.text ?? "";
  if (suggestedText.trim().length === 0) {
    throw new Error("preview-unavailable");
  }

  return {
    context: args.context,
    executionId: result.data.executionId,
    originalText,
    selection: args.selection ?? null,
    skill: args.skill,
    sourceUserEditRevision: args.userEditRevision,
    suggestedText,
    runId: result.data.runId,
  };
}

export async function acceptAiPreview(args: {
  api: PreloadApi;
  bridge: EditorBridge;
  preview: AiPreview;
  runWithoutAutosave?: RunWithoutAutosave;
  getUserEditRevision: GetUserEditRevision;
  getEditorContextRevision: GetEditorContextRevision;
}): Promise<AcceptAiPreviewResult> {
  if (
    args.getUserEditRevision() !== args.preview.sourceUserEditRevision
    || args.getEditorContextRevision() !== args.preview.context.revision
  ) {
    throw new StaleAiPreviewError();
  }

  const runWithoutAutosave = args.runWithoutAutosave ?? ((operation) => operation());
  const beforeApply = args.preview.selection === null ? null : args.bridge.getContent();
  if (args.preview.selection !== null) {
    const replaceResult = runWithoutAutosave(() => args.bridge.replaceSelection(args.preview.selection!, args.preview.suggestedText));
    if (replaceResult.ok === false) {
      throw new SelectionChangedError();
    }
  }

  const appliedAtUserEditRevision = args.getUserEditRevision();
  const appliedAtEditorContextRevision = args.getEditorContextRevision();
  const confirmResult = await args.api.ai.confirmSkill({
    executionId: args.preview.executionId,
    action: "accept",
    projectId: args.preview.context.projectId,
  });

  if (!isAcceptedPreviewConfirmation(confirmResult)) {
    if (beforeApply !== null) {
      runWithoutAutosave(() => {
        if (
          args.getUserEditRevision() === appliedAtUserEditRevision
          && args.getEditorContextRevision() === appliedAtEditorContextRevision
        ) {
          args.bridge.setContent(beforeApply);
        }
      });
    }
    throw toAcceptConfirmationError(confirmResult);
  }

  const confirmedDocument = await readConfirmedDocument(args.api, args.preview.context);
  if (
    args.getUserEditRevision() === appliedAtUserEditRevision
    && args.getEditorContextRevision() === appliedAtEditorContextRevision
  ) {
    runWithoutAutosave(() => {
      args.bridge.setContent(JSON.parse(confirmedDocument.contentJson));
    });
  }

  let feedbackError: Error | null = null;
  try {
    const feedbackResult = await args.api.ai.submitSkillFeedback({
      runId: args.preview.runId,
      action: "accept",
      evidenceRef: "renderer-p1-accept",
    });

    if (feedbackResult.ok === false) {
      feedbackError = toFeedbackError(feedbackResult.error);
    }
  } catch (error) {
    feedbackError = error instanceof Error ? error : new Error("AI feedback failed");
  }

  return {
    feedbackError,
    updatedAt: confirmedDocument.updatedAt,
  };
}

export async function rejectAiPreview(api: PreloadApi, preview: AiPreview): Promise<void> {
  const confirmResult = await api.ai.confirmSkill({
    executionId: preview.executionId,
    action: "reject",
    projectId: preview.context.projectId,
  });

  if (confirmResult.ok === false) {
    throw new RendererIpcError(confirmResult.error);
  }
}
