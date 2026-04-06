import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EditorBridge } from "@/editor/bridge";
import type { SelectionRef } from "@/editor/schema";
import {
  SelectionChangedError,
  StaleAiPreviewError,
  acceptAiPreview,
  rejectAiPreview,
  requestAiPreview,
  type AiPreview,
  type WorkbenchContextToken,
  type WorkbenchSkillId,
} from "@/features/workbench/runtime";
import { getHumanErrorMessage } from "@/lib/errorMessages";
import type { PreloadApi } from "@/lib/preloadApi";

import type { AutosaveController } from "./useAutosaveController";
import type { MutableRef } from "./types";

const DEFAULT_MODEL = "gpt-4.1-mini";

export interface AiSkillControllerDeps {
  api: PreloadApi;
  activeContextTokenRef: MutableRef<WorkbenchContextToken | null>;
  editorBridge: EditorBridge;
  autosave: AutosaveController;
  stickySelection: SelectionRef | null;
  setStickySelection: React.Dispatch<React.SetStateAction<SelectionRef | null>>;
  setPreview: React.Dispatch<React.SetStateAction<AiPreview | null>>;
  preview: AiPreview | null;
  userEditRevisionRef: MutableRef<number>;
  editorContextRevisionRef: MutableRef<number>;
}

export interface AiSkillController {
  activeSkill: WorkbenchSkillId;
  busy: boolean;
  handleAcceptPreview: () => Promise<void>;
  handleGeneratePreview: () => Promise<void>;
  handleRejectPreview: () => Promise<void>;
  instruction: string;
  isLatestBusyOperation: (operationId: number) => boolean;
  model: string;
  reserveBusyOperation: () => number;
  resetAiConversation: () => void;
  retryLastAcceptSave: () => void;
  runAcceptPreview: (acceptingPreview: AiPreview) => Promise<void>;
  selectAiSkill: (skillId: WorkbenchSkillId) => void;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
  setModel: React.Dispatch<React.SetStateAction<string>>;
}

export function useAiSkillController(deps: AiSkillControllerDeps): AiSkillController {
  const {
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
  } = deps;
  const { t } = useTranslation();

  const latestBusyOperationRef = useRef(0);

  const [activeSkill, setActiveSkill] = useState<WorkbenchSkillId>("builtin:polish");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  const reserveBusyOperation = useCallback(() => {
    latestBusyOperationRef.current += 1;
    return latestBusyOperationRef.current;
  }, []);

  const isLatestBusyOperation = useCallback((operationId: number) => (
    latestBusyOperationRef.current === operationId
  ), []);

  const selectAiSkill = useCallback((skillId: WorkbenchSkillId) => {
    setActiveSkill(skillId);
    setPreview(null);
    autosave.clearAcceptSaveFailure();
    autosave.setWorkbenchError(null, null);
  }, [autosave, setPreview]);

  const resetAiConversation = useCallback(() => {
    setInstruction("");
    setPreview(null);
    autosave.clearAcceptSaveFailure();
    autosave.setWorkbenchError(null, null);
    setStickySelection(null);
  }, [autosave, setPreview, setStickySelection]);

  const runAcceptPreview = useCallback(async (acceptingPreview: AiPreview) => {
    if (autosave.isCurrentContextToken(acceptingPreview.context) === false) {
      return;
    }

    const busyOperationId = reserveBusyOperation();
    autosave.clearPendingAutosaveTimer();
    autosave.pendingAutosaveDraftRef.current = null;
    autosave.clearAutosaveController();
    autosave.acceptSaveRetryControllerRef.current = { preview: acceptingPreview, saveState: "saving" };
    const saveRequestId = autosave.reserveSaveRequest();
    const acceptStartedAtUserEditRevision = userEditRevisionRef.current;
    const acceptStartedAtEditorContextRevision = editorContextRevisionRef.current;

    try {
      setBusy(true);
      autosave.setWorkbenchError(null, null);
      autosave.setSaveUiState("saving");
      const result = await autosave.queueSaveRequest(() => acceptAiPreview({
        api,
        bridge: editorBridge,
        preview: acceptingPreview,
        runWithoutAutosave: autosave.runWithoutAutosave,
        getUserEditRevision: () => userEditRevisionRef.current,
        getEditorContextRevision: () => editorContextRevisionRef.current,
      }));
      const acceptPathStillActive = autosave.acceptSaveRetryControllerRef.current.saveState === "saving"
        && autosave.acceptSaveRetryControllerRef.current.preview?.runId === acceptingPreview.runId;
      if (acceptPathStillActive) {
        autosave.clearAcceptSaveRetryController();
      }
      if (autosave.isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
        autosave.setWorkbenchError(result.feedbackError ? getHumanErrorMessage(result.feedbackError, t) : null, result.feedbackError ? "general" : null);
      }
      if (autosave.isLatestSaveRequest(saveRequestId) && acceptPathStillActive) {
        autosave.setSaveUiState("saved");
        autosave.setLastSavedAt(result.updatedAt);
        autosave.armSavedStateDecayTimer(saveRequestId);
      }
    } catch (error) {
      const acceptPathStillActive = autosave.acceptSaveRetryControllerRef.current.saveState === "saving"
        && autosave.acceptSaveRetryControllerRef.current.preview?.runId === acceptingPreview.runId;
      const stalePreviewError = error instanceof StaleAiPreviewError;
      const acceptPathInvalidated = userEditRevisionRef.current !== acceptStartedAtUserEditRevision
        || editorContextRevisionRef.current !== acceptStartedAtEditorContextRevision;
      if (acceptPathStillActive && (stalePreviewError || acceptPathInvalidated)) {
        autosave.clearAcceptSaveRetryController();
      }
      if (autosave.isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && stalePreviewError) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
        autosave.setWorkbenchError(t("messages.previewStale"), "accept");
      } else if (autosave.isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && acceptPathInvalidated) {
        setPreview((currentPreview) => currentPreview?.runId === acceptingPreview.runId ? null : currentPreview);
      }
      if (autosave.isCurrentContextToken(acceptingPreview.context) && acceptPathStillActive && stalePreviewError === false && acceptPathInvalidated === false) {
        if (error instanceof SelectionChangedError) {
          autosave.setWorkbenchError(t("messages.selectionChanged"), "accept");
        } else {
          autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "accept");
        }
      }
      if (autosave.isLatestSaveRequest(saveRequestId) && acceptPathStillActive && stalePreviewError) {
        autosave.setSaveUiState("idle");
      } else if (autosave.isLatestSaveRequest(saveRequestId) && acceptPathStillActive && acceptPathInvalidated === false) {
        autosave.acceptSaveRetryControllerRef.current = { preview: acceptingPreview, saveState: "error" };
        autosave.setSaveUiState("error", "accept");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  }, [api, autosave, editorBridge, editorContextRevisionRef, isLatestBusyOperation, reserveBusyOperation, setPreview, t, userEditRevisionRef]);

  const retryLastAcceptSave = useCallback(() => {
    const latestAcceptSave = autosave.acceptSaveRetryControllerRef.current;
    if (latestAcceptSave.preview === null || latestAcceptSave.saveState !== "error") {
      return;
    }

    void runAcceptPreview(latestAcceptSave.preview);
  }, [autosave.acceptSaveRetryControllerRef, runAcceptPreview]);

  const handleAcceptPreview = useCallback(async () => {
    if (preview === null) {
      return;
    }

    await runAcceptPreview(preview);
  }, [preview, runAcceptPreview]);

  const handleRejectPreview = useCallback(async () => {
    if (preview === null) {
      return;
    }

    const previewContext = preview.context;
    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      await rejectAiPreview(api, preview);
      if (autosave.isCurrentContextToken(previewContext)) {
        setPreview(null);
        autosave.clearAcceptSaveFailure();
        autosave.setWorkbenchError(null, null);
      }
    } catch (error) {
      if (autosave.isCurrentContextToken(previewContext)) {
        autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  }, [api, autosave, isLatestBusyOperation, preview, reserveBusyOperation, setPreview, t]);

  const handleGeneratePreview = useCallback(async () => {
    const previewContext = activeContextTokenRef.current;
    if (previewContext === null) {
      return;
    }

    autosave.clearAcceptSaveFailure();

    if (activeSkill === "builtin:rewrite" && instruction.trim().length === 0) {
      autosave.setWorkbenchError(t("messages.rewriteInstructionRequired"), "general");
      return;
    }

    if (activeSkill !== "builtin:continue" && stickySelection === null) {
      return;
    }

    const cursorContext = activeSkill === "builtin:continue" ? editorBridge.getCursorContext() : null;
    if (activeSkill === "builtin:continue" && (cursorContext === null || cursorContext.precedingText.trim().length === 0)) {
      autosave.setWorkbenchError(t("messages.continueContextEmpty"), "general");
      return;
    }

    const busyOperationId = reserveBusyOperation();
    try {
      setBusy(true);
      autosave.setWorkbenchError(null, null);
      const nextPreview = activeSkill === "builtin:continue"
        ? await requestAiPreview({
            api,
            context: previewContext,
            cursorPosition: cursorContext!.cursorPosition,
            instruction,
            model,
            precedingText: cursorContext!.precedingText,
            skillId: activeSkill,
            userEditRevision: userEditRevisionRef.current,
          })
        : await requestAiPreview({
            api,
            context: previewContext,
            selection: stickySelection!,
            instruction,
            model,
            skillId: activeSkill,
            userEditRevision: userEditRevisionRef.current,
          });
      if (autosave.isCurrentContextToken(previewContext)) {
        autosave.clearAcceptSaveFailure();
        setPreview(nextPreview);
        setStickySelection(null);
      }
    } catch (error) {
      if (autosave.isCurrentContextToken(previewContext)) {
        if (error instanceof Error && error.message === "preview-unavailable") {
          autosave.setWorkbenchError(t("messages.previewUnavailable"), "general");
        } else {
          autosave.setWorkbenchError(getHumanErrorMessage(error as Error, t), "general");
        }
      }
    } finally {
      if (isLatestBusyOperation(busyOperationId)) {
        setBusy(false);
      }
    }
  }, [activeContextTokenRef, activeSkill, api, autosave, editorBridge, instruction, isLatestBusyOperation, model, reserveBusyOperation, setPreview, setStickySelection, stickySelection, t, userEditRevisionRef]);

  return {
    activeSkill,
    busy,
    handleAcceptPreview,
    handleGeneratePreview,
    handleRejectPreview,
    instruction,
    isLatestBusyOperation,
    model,
    reserveBusyOperation,
    resetAiConversation,
    retryLastAcceptSave,
    runAcceptPreview,
    selectAiSkill,
    setBusy,
    setInstruction,
    setModel,
  };
}
