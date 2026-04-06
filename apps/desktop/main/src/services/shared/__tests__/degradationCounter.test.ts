import { describe, it, expect } from "vitest";

import {
  DegradationCounter,
  logWarn,
  type WarnCapableLogger,
} from "../degradationCounter";

describe("DegradationCounter", () => {
  describe("constructor defaults", () => {
    it("should use default threshold of 3", () => {
      const counter = new DegradationCounter();
      expect(counter.threshold).toBe(3);
    });

    it("should use custom threshold", () => {
      const counter = new DegradationCounter({ threshold: 5 });
      expect(counter.threshold).toBe(5);
    });

    it("should clamp threshold to minimum of 1", () => {
      const counter = new DegradationCounter({ threshold: 0 });
      expect(counter.threshold).toBe(1);
    });

    it("should floor fractional threshold", () => {
      const counter = new DegradationCounter({ threshold: 2.7 });
      expect(counter.threshold).toBe(2);
    });
  });

  describe("record", () => {
    it("should return count=1 on first record", () => {
      const counter = new DegradationCounter({ threshold: 3 });
      const snap = counter.record("key-1");
      expect(snap.count).toBe(1);
      expect(snap.escalated).toBe(false);
    });

    it("should increment count on subsequent records", () => {
      const counter = new DegradationCounter({ threshold: 3 });
      counter.record("key-1");
      const snap = counter.record("key-1");
      expect(snap.count).toBe(2);
      expect(snap.escalated).toBe(false);
    });

    it("should escalate when count reaches threshold", () => {
      const counter = new DegradationCounter({ threshold: 3 });
      counter.record("key-1");
      counter.record("key-1");
      const snap = counter.record("key-1");
      expect(snap.count).toBe(3);
      expect(snap.escalated).toBe(true);
    });

    it("should continue escalating beyond threshold", () => {
      const counter = new DegradationCounter({ threshold: 2 });
      counter.record("key-1");
      counter.record("key-1");
      const snap = counter.record("key-1");
      expect(snap.count).toBe(3);
      expect(snap.escalated).toBe(true);
    });

    it("should track keys independently", () => {
      const counter = new DegradationCounter({ threshold: 2 });
      counter.record("key-a");
      counter.record("key-a");
      const snapB = counter.record("key-b");
      expect(snapB.count).toBe(1);
      expect(snapB.escalated).toBe(false);
    });

    it("should record firstDegradedAt on first occurrence", () => {
      let now = 1000;
      const counter = new DegradationCounter({
        threshold: 3,
        now: () => now,
      });

      const first = counter.record("key-1");
      expect(first.firstDegradedAt).toBe(1000);

      now = 2000;
      const second = counter.record("key-1");
      expect(second.firstDegradedAt).toBe(1000);
    });

    it("should escalate immediately when threshold is 1", () => {
      const counter = new DegradationCounter({ threshold: 1 });
      const snap = counter.record("key-1");
      expect(snap.escalated).toBe(true);
    });
  });

  describe("reset", () => {
    it("should clear counter for key", () => {
      const counter = new DegradationCounter({ threshold: 3 });
      counter.record("key-1");
      counter.record("key-1");
      counter.reset("key-1");

      const snap = counter.record("key-1");
      expect(snap.count).toBe(1);
      expect(snap.escalated).toBe(false);
    });

    it("should not throw when resetting non-existent key", () => {
      const counter = new DegradationCounter();
      expect(() => counter.reset("nonexistent")).not.toThrow();
    });

    it("should not affect other keys", () => {
      const counter = new DegradationCounter({ threshold: 3 });
      counter.record("key-a");
      counter.record("key-a");
      counter.record("key-b");

      counter.reset("key-a");

      const snapB = counter.record("key-b");
      expect(snapB.count).toBe(2);
    });
  });
});

describe("logWarn", () => {
  it("should use warn method when available", () => {
    const calls: Array<{ method: string; event: string }> = [];
    const logger: WarnCapableLogger = {
      info: (event) => { calls.push({ method: "info", event }); },
      error: (event) => { calls.push({ method: "error", event }); },
      warn: (event) => { calls.push({ method: "warn", event }); },
    };

    logWarn(logger, "degraded");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("warn");
    expect(calls[0].event).toBe("degraded");
  });

  it("should fall back to info when warn is undefined", () => {
    const calls: Array<{ method: string; event: string }> = [];
    const logger: WarnCapableLogger = {
      info: (event) => { calls.push({ method: "info", event }); },
      error: (event) => { calls.push({ method: "error", event }); },
    };

    logWarn(logger, "degraded");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("info");
  });

  it("should forward data to warn", () => {
    let capturedData: Record<string, unknown> | undefined;
    const logger: WarnCapableLogger = {
      info: () => {},
      error: () => {},
      warn: (_event, data) => { capturedData = data; },
    };

    logWarn(logger, "test", { key: "value" });
    expect(capturedData).toEqual({ key: "value" });
  });
});
