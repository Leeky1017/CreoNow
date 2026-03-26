import assert from "node:assert/strict";

import type { DocumentError } from "../../services/documents/documentService";
import { mapDocumentErrorToIpcError } from "../file";

const domainError: DocumentError = {
  code: "NOT_FOUND",
  message: "Document not found",
  details: { documentId: "doc-1" },
  retryable: false,
  traceId: "trace-doc-1",
};

const mapped = mapDocumentErrorToIpcError(domainError);

assert.deepEqual(
  mapped,
  {
    code: "NOT_FOUND",
    message: "Document not found",
    details: { documentId: "doc-1" },
    retryable: false,
    traceId: "trace-doc-1",
  },
  "DOC-S2-SED-S2: IPC layer should map DocumentError to stable IpcError envelope",
);

assert.notStrictEqual(
  mapped,
  domainError,
  "DOC-S2-SED-S2: mapping should build IPC envelope explicitly instead of passing domain object by reference",
);
