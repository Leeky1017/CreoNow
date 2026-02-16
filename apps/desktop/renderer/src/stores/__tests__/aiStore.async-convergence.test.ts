import { describe, expect, it } from "vitest";

import { createAiStore } from "../aiStore";

describe("aiStore async convergence", () => {
  it("WB-AUD-C1B-S2 converges refreshSkills to error when invoke throws", async () => {
    const store = createAiStore({
      invoke: async (channel) => {
        if (channel === "skill:registry:list") {
          throw new Error("registry unavailable");
        }
        return {
          ok: false,
          error: {
            code: "INTERNAL",
            message: `unexpected channel: ${String(channel)}`,
          },
        } as never;
      },
    });

    await expect(store.getState().refreshSkills()).resolves.toBeUndefined();

    const state = store.getState();
    expect(state.skillsStatus).toBe("error");
    expect(state.skillsStatus).not.toBe("loading");
    expect(state.skillsLastError).toMatchObject({
      code: "INTERNAL",
    });
  });
});
