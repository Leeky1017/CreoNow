import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createSettingsService,
  type CharacterEntry,
  type LocationEntry,
  type SettingsService,
} from "../services/settings/settingsService";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type CharacterCreatePayload = {
  projectId: string;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
};

type CharacterReadPayload = {
  projectId: string;
  id: string;
};

type CharacterUpdatePayload = {
  projectId: string;
  id: string;
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
};

type CharacterDeletePayload = {
  projectId: string;
  id: string;
};

type CharacterListPayload = {
  projectId: string;
};

type LocationCreatePayload = {
  projectId: string;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
};

type LocationReadPayload = {
  projectId: string;
  id: string;
};

type LocationUpdatePayload = {
  projectId: string;
  id: string;
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
};

type LocationDeletePayload = {
  projectId: string;
  id: string;
};

type LocationListPayload = {
  projectId: string;
};

function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  value: unknown,
  fieldName: string,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ): void;
}

/**
 * Register `settings:*` IPC handlers (Character / Location CRUD).
 *
 * Why: Settings (character/location lists) are P3 project-scoped data exposed
 * through the same contract-first cross-process pattern as Knowledge Graph.
 */
export function registerSettingsIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  let service: SettingsService | null = null;

  function getService(): SettingsService | null {
    if (!deps.db) return null;
    if (!service) {
      const eventBus: EventBusLike = {
        emit: () => {},
        on: () => {},
        off: () => {},
      };
      service = createSettingsService({ db: deps.db, eventBus });
    }
    return service;
  }

  function handleWithProjectAccess<TPayload, TResponse>(
    channel: string,
    listener: (
      event: unknown,
      payload: TPayload,
    ) => Promise<IpcResponse<TResponse>>,
  ): void {
    deps.ipcMain.handle(channel, async (event, payload) => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding: deps.projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response as IpcResponse<TResponse>;
      }
      return listener(event, payload as TPayload);
    });
  }

  // ── Character CRUD ──

  handleWithProjectAccess(
    "settings:character:create",
    async (
      _event,
      payload: CharacterCreatePayload,
    ): Promise<IpcResponse<CharacterEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<CharacterEntry>();

      const nameErr = validateNonEmptyString(payload.name, "name");
      if (nameErr) {
        return {
          ok: false,
          error: { code: "CHARACTER_NAME_REQUIRED", message: nameErr },
        };
      }

      const res = await svc.createCharacter({
        projectId: payload.projectId,
        name: payload.name,
        description: payload.description,
        attributes: payload.attributes,
      });

      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "INTERNAL_ERROR") as "CHARACTER_NAME_REQUIRED",
          message: res.error?.message ?? "Unknown error",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:character:read",
    async (
      _event,
      payload: CharacterReadPayload,
    ): Promise<IpcResponse<CharacterEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<CharacterEntry>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.getCharacter(payload.id);
      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "CHARACTER_NOT_FOUND") as "CHARACTER_NOT_FOUND",
          message: res.error?.message ?? "Character not found",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:character:update",
    async (
      _event,
      payload: CharacterUpdatePayload,
    ): Promise<IpcResponse<CharacterEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<CharacterEntry>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.updateCharacter({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        attributes: payload.attributes,
      });

      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "CHARACTER_NOT_FOUND") as "CHARACTER_NOT_FOUND",
          message: res.error?.message ?? "Update failed",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:character:delete",
    async (
      _event,
      payload: CharacterDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ deleted: true }>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.deleteCharacter(payload.id);
      if (res.success) {
        return { ok: true, data: { deleted: true } };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "CHARACTER_NOT_FOUND") as "CHARACTER_NOT_FOUND",
          message: res.error?.message ?? "Delete failed",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:character:list",
    async (
      _event,
      payload: CharacterListPayload,
    ): Promise<IpcResponse<{ items: CharacterEntry[] }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ items: CharacterEntry[] }>();

      const res = await svc.listCharacters(payload.projectId);
      if (res.success) {
        return { ok: true, data: { items: res.data ?? [] } };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "INTERNAL_ERROR") as "INTERNAL_ERROR",
          message: res.error?.message ?? "List failed",
        },
      };
    },
  );

  // ── Location CRUD ──

  handleWithProjectAccess(
    "settings:location:create",
    async (
      _event,
      payload: LocationCreatePayload,
    ): Promise<IpcResponse<LocationEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<LocationEntry>();

      const nameErr = validateNonEmptyString(payload.name, "name");
      if (nameErr) {
        return {
          ok: false,
          error: { code: "LOCATION_NAME_REQUIRED", message: nameErr },
        };
      }

      const res = await svc.createLocation({
        projectId: payload.projectId,
        name: payload.name,
        description: payload.description,
        attributes: payload.attributes,
      });

      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "INTERNAL_ERROR") as "LOCATION_NAME_REQUIRED",
          message: res.error?.message ?? "Unknown error",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:location:read",
    async (
      _event,
      payload: LocationReadPayload,
    ): Promise<IpcResponse<LocationEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<LocationEntry>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.getLocation(payload.id);
      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "LOCATION_NOT_FOUND") as "LOCATION_NOT_FOUND",
          message: res.error?.message ?? "Location not found",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:location:update",
    async (
      _event,
      payload: LocationUpdatePayload,
    ): Promise<IpcResponse<LocationEntry>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<LocationEntry>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.updateLocation({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        attributes: payload.attributes,
      });

      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "LOCATION_NOT_FOUND") as "LOCATION_NOT_FOUND",
          message: res.error?.message ?? "Update failed",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:location:delete",
    async (
      _event,
      payload: LocationDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ deleted: true }>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      const res = await svc.deleteLocation(payload.id);
      if (res.success) {
        return { ok: true, data: { deleted: true } };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "LOCATION_NOT_FOUND") as "LOCATION_NOT_FOUND",
          message: res.error?.message ?? "Delete failed",
        },
      };
    },
  );

  handleWithProjectAccess(
    "settings:location:list",
    async (
      _event,
      payload: LocationListPayload,
    ): Promise<IpcResponse<{ items: LocationEntry[] }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ items: LocationEntry[] }>();

      const res = await svc.listLocations(payload.projectId);
      if (res.success) {
        return { ok: true, data: { items: res.data ?? [] } };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "INTERNAL_ERROR") as "INTERNAL_ERROR",
          message: res.error?.message ?? "List failed",
        },
      };
    },
  );
}
