export type VersionDiffStats = {
  addedLines: number;
  removedLines: number;
  changedHunks: number;
};

export type VersionDiffPayload = {
  diffText: string;
  hasDifferences: boolean;
  stats: VersionDiffStats;
  aiMarked: boolean;
};
