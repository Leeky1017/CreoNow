ALTER TABLE document_versions
  ADD COLUMN parent_version_id TEXT REFERENCES document_versions(version_id) ON DELETE SET NULL;

WITH ordered AS (
  SELECT
    version_id,
    LAG(version_id) OVER (PARTITION BY document_id ORDER BY rowid ASC) AS parent_version_id
  FROM document_versions
)
UPDATE document_versions
SET parent_version_id = (
  SELECT ordered.parent_version_id
  FROM ordered
  WHERE ordered.version_id = document_versions.version_id
)
WHERE parent_version_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_versions_parent_version
  ON document_versions (parent_version_id);
