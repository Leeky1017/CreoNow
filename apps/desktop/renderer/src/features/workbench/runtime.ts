import type { IpcResponseData } from "@shared/types/ipc-generated";

import type { EditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import type { PreloadApi } from "@/lib/preloadApi";

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

export interface AiPreview {
  originalText: string;
  runId: string;
  selection: SelectionRef;
  suggestedText: string;
}

export class SelectionChangedError extends Error {
  public constructor() {
    super("selection-changed");
    this.name = "SelectionChangedError";
  }
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
  documentId: string;
  instruction: string;
  model: string;
  projectId: string;
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
    input: prompt,
    mode: "ask",
    model: args.model,
    stream: false,
    context: {
      projectId: args.projectId,
      documentId: args.documentId,
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
    originalText: args.selection.text,
    selection: args.selection,
    suggestedText,
    runId: result.data.runId,
  };
}

export async function acceptAiPreview(args: {
  api: PreloadApi;
  bridge: EditorBridge;
  documentId: string;
  preview: AiPreview;
  projectId: string;
}): Promise<void> {
  const beforeApply = args.bridge.getContent();
  const replaceResult = args.bridge.replaceSelection(args.preview.selection, args.preview.suggestedText);
  if (replaceResult.ok === false) {
    throw new SelectionChangedError();
  }

  const saveResult = await args.api.file.saveDocument({
    projectId: args.projectId,
    documentId: args.documentId,
    actor: "ai",
    reason: "ai-accept",
    contentJson: JSON.stringify(args.bridge.getContent()),
  });

  if (saveResult.ok === false) {
    args.bridge.setContent(beforeApply);
    throw saveResult.error;
  }

  await args.api.ai.submitSkillFeedback({
    runId: args.preview.runId,
    action: "accept",
    evidenceRef: "renderer-p1-accept",
  });
}

export async function rejectAiPreview(api: PreloadApi, preview: AiPreview): Promise<void> {
  await api.ai.submitSkillFeedback({
    runId: preview.runId,
    action: "reject",
    evidenceRef: "renderer-p1-reject",
  });
}
