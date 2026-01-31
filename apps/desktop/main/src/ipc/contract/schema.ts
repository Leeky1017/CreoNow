export type IpcSchema =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "array"; element: IpcSchema }
  | { kind: "union"; variants: readonly IpcSchema[] }
  | { kind: "object"; fields: Readonly<Record<string, IpcSchema>> }
  | { kind: "optional"; schema: IpcSchema };

export const s = {
  string(): IpcSchema {
    return { kind: "string" };
  },
  number(): IpcSchema {
    return { kind: "number" };
  },
  boolean(): IpcSchema {
    return { kind: "boolean" };
  },
  literal(value: string | number | boolean): IpcSchema {
    return { kind: "literal", value };
  },
  array(element: IpcSchema): IpcSchema {
    return { kind: "array", element };
  },
  union(...variants: readonly IpcSchema[]): IpcSchema {
    return { kind: "union", variants };
  },
  object(fields: Readonly<Record<string, IpcSchema>>): IpcSchema {
    return { kind: "object", fields };
  },
  optional(schema: IpcSchema): IpcSchema {
    return { kind: "optional", schema };
  },
} as const;
