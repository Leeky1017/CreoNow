import { describe, it, expect } from "vitest";

import { createMainEventBus } from "../eventBus";

describe("createMainEventBus", () => {
  describe("emit", () => {
    it("should call registered handler for matching event", () => {
      const bus = createMainEventBus();
      const calls: Array<Record<string, unknown>> = [];

      bus.on("settings:changed", (payload) => {
        calls.push(payload);
      });

      bus.emit({ type: "settings:changed", key: "theme" });

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({ type: "settings:changed", key: "theme" });
    });

    it("should not call handler for different event type", () => {
      const bus = createMainEventBus();
      const calls: Array<Record<string, unknown>> = [];

      bus.on("settings:changed", (payload) => {
        calls.push(payload);
      });

      bus.emit({ type: "project:opened" });
      expect(calls).toHaveLength(0);
    });

    it("should call multiple handlers for same event", () => {
      const bus = createMainEventBus();
      let callCount = 0;

      bus.on("ping", () => { callCount += 1; });
      bus.on("ping", () => { callCount += 1; });

      bus.emit({ type: "ping" });
      expect(callCount).toBe(2);
    });

    it("should ignore events with empty type", () => {
      const bus = createMainEventBus();
      let called = false;

      bus.on("", () => { called = true; });
      bus.emit({ type: "" });
      expect(called).toBe(false);
    });

    it("should ignore events with non-string type", () => {
      const bus = createMainEventBus();
      let called = false;

      bus.on("123", () => { called = true; });
      bus.emit({ type: 123 as unknown as string });
      expect(called).toBe(false);
    });

    it("should not throw when no handlers registered", () => {
      const bus = createMainEventBus();
      expect(() => bus.emit({ type: "orphan" })).not.toThrow();
    });
  });

  describe("on / off", () => {
    it("should stop calling handler after off", () => {
      const bus = createMainEventBus();
      let callCount = 0;
      const handler = () => { callCount += 1; };

      bus.on("tick", handler);
      bus.emit({ type: "tick" });
      expect(callCount).toBe(1);

      bus.off("tick", handler);
      bus.emit({ type: "tick" });
      expect(callCount).toBe(1);
    });

    it("should not throw when removing non-existent handler", () => {
      const bus = createMainEventBus();
      expect(() => bus.off("nope", () => {})).not.toThrow();
    });

    it("should clean up handler set when last handler is removed", () => {
      const bus = createMainEventBus();
      const handler = () => {};

      bus.on("once", handler);
      bus.off("once", handler);

      // Emit should not throw even after cleanup
      expect(() => bus.emit({ type: "once" })).not.toThrow();
    });

    it("should keep other handlers when one is removed", () => {
      const bus = createMainEventBus();
      let handlerACount = 0;
      let handlerBCount = 0;

      const handlerA = () => { handlerACount += 1; };
      const handlerB = () => { handlerBCount += 1; };

      bus.on("multi", handlerA);
      bus.on("multi", handlerB);
      bus.off("multi", handlerA);

      bus.emit({ type: "multi" });
      expect(handlerACount).toBe(0);
      expect(handlerBCount).toBe(1);
    });
  });
});
