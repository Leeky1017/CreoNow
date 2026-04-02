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
  selection: SelectionRef;
  suggestedText: string;
}

export interface AcceptAiPreviewResult {
  feedbackError: Error | null;
  updatedAt: number;
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

async function readConfirmedDocumentUpdatedAt(
  api: PreloadApi,
  context: WorkbenchContextToken,
): Promise<number> {
  const readResult = await api.file.readDocument({
    projectId: context.projectId,
    documentId: context.documentId,
  });

  if (readResult.ok === false) {
    return Date.now();
  }

  return readResult.data.updatedAt;
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
  instruction: string;
  model: string;
  selection: SelectionRef;
}): Promise<AiPreview> {
  const prompt = [
    "Selection context:",
    args.selection.text,
    "",
    args.instruction.trim(),
  ].join(String.fromCharCode(10));

  const result = await args.api.ai.runSkill({
    skillId: "builtin:rewrite",
    hasSelection: true,
    selection: args.selection,
    input: prompt,
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
    originalText: args.selection.text,
    selection: args.selection,
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
  const beforeApply = args.bridge.getContent();
  const runWithoutAutosave = args.runWithoutAutosave ?? ((operation) => operation());
  const replaceResult = runWithoutAutosave(() => args.bridge.replaceSelection(args.preview.selection, args.preview.suggestedText));
  if (replaceResult.ok === false) {
    throw new SelectionChangedError();
  }

  const appliedAtUserEditRevision = args.getUserEditRevision();
  const appliedAtEditorContextRevision = args.getEditorContextRevision();
  const confirmResult = await args.api.ai.confirmSkill({
    executionId: args.preview.executionId,
    action: "accept",
  });

  if (confirmResult.ok === false) {
    runWithoutAutosave(() => {
      if (
        args.getUserEditRevision() === appliedAtUserEditRevision
        && args.getEditorContextRevision() === appliedAtEditorContextRevision
      ) {
        args.bridge.setContent(beforeApply);
      }
    });
    throw confirmResult.error;
  }

  const updatedAt = await readConfirmedDocumentUpdatedAt(args.api, args.preview.context);

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
    updatedAt,
  };
}

export async function rejectAiPreview(api: PreloadApi, preview: AiPreview): Promise<void> {
  const confirmResult = await api.ai.confirmSkill({
    executionId: preview.executionId,
    action: "reject",
  });

  if (confirmResult.ok === false) {
    throw new RendererIpcError(confirmResult.error);
  }
}
