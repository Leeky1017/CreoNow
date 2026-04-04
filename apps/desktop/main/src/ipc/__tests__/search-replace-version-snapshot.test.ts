import { describe, it } from "vitest";

import { runReplaceVersionSnapshotScenario } from "../../../../tests/integration/search/replace-version-snapshot-scenario";

describe("search replace version snapshot lineage", () => {
  it("same created_at tie still links pre-search-replace to newest inserted version", async () => {
    await runReplaceVersionSnapshotScenario();
  });
});
