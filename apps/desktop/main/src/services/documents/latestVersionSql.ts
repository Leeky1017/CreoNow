export const LATEST_DOCUMENT_VERSION_ORDER_BY =
  "ORDER BY created_at DESC, rowid DESC LIMIT 1";

export const SELECT_LATEST_DOCUMENT_VERSION_ID_SQL =
  `SELECT version_id as versionId FROM document_versions WHERE document_id = ? ${LATEST_DOCUMENT_VERSION_ORDER_BY}`;
