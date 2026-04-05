export const EXPORT_PROGRESS_CHANNEL = "export:progress" as const;

export type ExportProgressEvent = {
  type: "export-progress";
  exportId: string;
  stage: "parsing" | "converting" | "writing";
  progress: number;
  currentDocument: string;
};
