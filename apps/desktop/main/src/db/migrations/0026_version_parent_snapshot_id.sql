ALTER TABLE document_versions
  ADD COLUMN parent_snapshot_id TEXT;

WITH ordered_versions AS (
  SELECT
    version_id,
    LAG(version_id) OVER (
      PARTITION BY document_id
      ORDER BY created_at ASC, version_id DESC
    ) AS computed_parent_snapshot_id
  FROM document_versions
)
UPDATE document_versions
SET parent_snapshot_id = (
  SELECT ordered_versions.computed_parent_snapshot_id
  FROM ordered_versions
  WHERE ordered_versions.version_id = document_versions.version_id
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_parent
  ON document_versions (document_id, parent_snapshot_id);
