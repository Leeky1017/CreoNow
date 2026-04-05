import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  P3_PARTICIPANT_IDS,
  attachP3LifecycleParticipant,
  getP3LifecycleParticipantSnapshot,
  registerP3LifecycleParticipants,
  resetP3LifecycleParticipantsForTests,
} from "../p3LifecycleParticipants";

describe("registerP3LifecycleParticipants", () => {
  beforeEach(() => {
    resetP3LifecycleParticipantsForTests();
  });

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

  it("参与者在 bind/unbind 时执行已挂接的模块逻辑并记录快照", async () => {
    const register = vi.fn();
    const settingsBind = vi.fn();
    const settingsUnbind = vi.fn();
    const searchBind = vi.fn();
    const searchUnbind = vi.fn();

    const detachSettings = attachP3LifecycleParticipant("settings", {
      bind: settingsBind,
      unbind: settingsUnbind,
    });
    const detachSearch = attachP3LifecycleParticipant("search", {
      bind: searchBind,
      unbind: searchUnbind,
    });

    registerP3LifecycleParticipants({
      register,
      bindAll: vi.fn(),
      unbindAll: vi.fn(),
      switchProject: vi.fn(),
    });

    const registered = new Map(
      register.mock.calls.map(([participant]) => [participant.id, participant]),
    );

    await registered.get("settings")?.unbind({
      projectId: "proj-a",
      traceId: "trace-unbind",
      signal: new AbortController().signal,
    });
    await registered.get("settings")?.bind({
      projectId: "proj-b",
      traceId: "trace-bind",
      signal: new AbortController().signal,
    });
    await registered.get("search")?.unbind({
      projectId: "proj-a",
      traceId: "trace-unbind",
      signal: new AbortController().signal,
    });
    await registered.get("search")?.bind({
      projectId: "proj-b",
      traceId: "trace-bind",
      signal: new AbortController().signal,
    });

    expect(settingsUnbind).toHaveBeenCalledWith({
      projectId: "proj-a",
      traceId: "trace-unbind",
    });
    expect(settingsBind).toHaveBeenCalledWith({
      projectId: "proj-b",
      traceId: "trace-bind",
    });
    expect(searchUnbind).toHaveBeenCalledOnce();
    expect(searchBind).toHaveBeenCalledOnce();
    expect(getP3LifecycleParticipantSnapshot("settings")).toEqual({
      bindCount: 1,
      unbindCount: 1,
      lastBoundProjectId: "proj-b",
      lastUnboundProjectId: "proj-a",
    });
    expect(getP3LifecycleParticipantSnapshot("search")).toEqual({
      bindCount: 1,
      unbindCount: 1,
      lastBoundProjectId: "proj-b",
      lastUnboundProjectId: "proj-a",
    });

    detachSettings();
    detachSearch();
  });
});
