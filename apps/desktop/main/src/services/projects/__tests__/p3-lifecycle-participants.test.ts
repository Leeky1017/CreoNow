import { describe, expect, it, vi } from "vitest";

import {
  P3_PARTICIPANT_IDS,
  registerP3LifecycleParticipants,
} from "../p3LifecycleParticipants";

describe("registerP3LifecycleParticipants", () => {
  it("为 P3 模块注册统一的 bind/unbind 参与者", () => {
    const register = vi.fn();

    registerP3LifecycleParticipants({
      register,
      bindAll: vi.fn(),
      unbindAll: vi.fn(),
      switchProject: vi.fn(),
    });

    expect(register).toHaveBeenCalledTimes(P3_PARTICIPANT_IDS.length);
    expect(register.mock.calls.map(([participant]) => participant.id)).toEqual(
      [...P3_PARTICIPANT_IDS],
    );
  });
});
