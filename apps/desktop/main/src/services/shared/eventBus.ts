import type { EventBusLike } from "../../ipc/helpers";

type EventHandler = (payload: Record<string, unknown>) => void;

/**
 * Create the main-process event bus shared by project-scoped P3 services.
 *
 * Why: settings/simple-memory/project metadata/export progress must exchange
 * events through one bus so autosync and lifecycle rebinding stay coherent.
 */
export function createMainEventBus(): EventBusLike {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    emit(event) {
      const eventName = typeof event.type === "string" ? event.type : "";
      if (eventName.length === 0) {
        return;
      }

      const listeners = handlers.get(eventName);
      if (!listeners) {
        return;
      }

      for (const handler of [...listeners]) {
        handler(event);
      }
    },
    on(eventName, handler) {
      const listeners = handlers.get(eventName) ?? new Set<EventHandler>();
      listeners.add(handler);
      handlers.set(eventName, listeners);
    },
    off(eventName, handler) {
      const listeners = handlers.get(eventName);
      if (!listeners) {
        return;
      }
      listeners.delete(handler);
      if (listeners.size === 0) {
        handlers.delete(eventName);
      }
    },
  };
}
