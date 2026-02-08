export const AI_MODEL_CATALOG_UPDATED_EVENT =
  "creonow:ai-model-catalog-updated" as const;

/**
 * Emit a UI-level signal that the active model catalog changed.
 */
export function emitAiModelCatalogUpdated(): void {
  window.dispatchEvent(new CustomEvent(AI_MODEL_CATALOG_UPDATED_EVENT));
}

/**
 * Subscribe to model catalog update events.
 */
export function onAiModelCatalogUpdated(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(AI_MODEL_CATALOG_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(AI_MODEL_CATALOG_UPDATED_EVENT, handler);
  };
}
