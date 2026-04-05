import type { EventBusLike } from "./helpers";

type EventHandler = (payload: Record<string, unknown>) => void;

export function createRuntimeEventBus(): EventBusLike {
  const listeners = new Map<string, Set<EventHandler>>();

  return {
    emit(event) {
      const eventType = event.type;
      if (typeof eventType !== "string" || eventType.trim().length === 0) {
        return;
      }
      const handlers = listeners.get(eventType);
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        handler(event);
      }
    },
    on(event, handler) {
      const normalizedEvent = event.trim();
      if (normalizedEvent.length === 0) {
        return;
      }
      const handlers = listeners.get(normalizedEvent) ?? new Set<EventHandler>();
      handlers.add(handler);
      listeners.set(normalizedEvent, handlers);
    },
    off(event, handler) {
      const normalizedEvent = event.trim();
      const handlers = listeners.get(normalizedEvent);
      if (!handlers) {
        return;
      }
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(normalizedEvent);
      }
    },
  };
}
