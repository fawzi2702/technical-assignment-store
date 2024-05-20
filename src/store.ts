import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";
import "reflect-metadata";

export type Permission = "r" | "w" | "rw" | "none";
const PermissionActions: Record<"read" | "write", Permission[]> = {
  read: ["r", "rw"],
  write: ["w", "rw"],
};
const PERMISSION_METADATA_KEY = Symbol("permission");

export type StoreResult<TStore extends IStore<TStore>> =
  | Store<TStore>
  | JSONPrimitive
  | undefined;

export type StoreValue<TStore extends IStore<TStore>> =
  | JSONObject
  | JSONArray
  | StoreResult<TStore>
  | (() => StoreResult<TStore>);

export interface IStore<TStore extends IStore<TStore> = any> {
  defaultPolicy: Permission;
  allowedToRead(key: keyof TStore): boolean;
  allowedToWrite(key: keyof TStore): boolean;
  read(path: string): StoreResult<TStore>;
  write(path: string, value: StoreValue<TStore>): StoreValue<TStore>;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export function Restrict(permissions: Permission) {
  return Reflect.metadata(PERMISSION_METADATA_KEY, permissions ?? "none");
}

export class Store<TStore extends IStore<TStore> = IStore>
  implements IStore<TStore>
{
  defaultPolicy: Permission = "rw";

  allowedToRead(key: keyof TStore): boolean {
    let permissionMetadata = Reflect.getMetadata(
      PERMISSION_METADATA_KEY,
      this,
      key as string | symbol
    );

    return PermissionActions.read.includes(
      permissionMetadata ?? this.defaultPolicy
    );
  }

  allowedToWrite(key: keyof TStore): boolean {
    let permissionMetadata = Reflect.getMetadata(
      PERMISSION_METADATA_KEY,
      this,
      key as string | symbol
    );

    return PermissionActions.write.includes(
      permissionMetadata ?? this.defaultPolicy
    );
  }

  read(path: string): StoreResult<TStore> {
    const pathKeys = path.split(":");

    let target: StoreResult<TStore> | StoreValue<TStore> = this;

    for (const key of pathKeys) {
      if (target === undefined || target === null) {
        return undefined;
      }

      if (target instanceof Store) {
        if (!target.allowedToRead(key as keyof TStore)) {
          throw new Error(`Cannot read property ${key}`);
        }

        target = (target as any)[key];
      } else if (typeof target === "function") {
        const store = (target as () => StoreResult<TStore>)() as Store<TStore>;
        target = (store as any)[key];
      } else {
        target = (target as any)[key];
      }
    }

    if (typeof target === "function") {
      target = (target as () => StoreResult<TStore>)();
    }

    return target as StoreResult<TStore>;
  }

  write(path: string, value: StoreValue<TStore>): StoreValue<TStore> {
    const pathKeys = path.split(":");

    let target: StoreResult<TStore> | StoreValue<TStore> = this;
    let previousTarget: StoreResult<TStore> | StoreValue<TStore> = target;
    const targetKey = pathKeys.pop() as string;

    for (const key of pathKeys) {
      if (target instanceof Store) {
        if (!target.allowedToWrite(key as keyof TStore)) {
          throw new Error(`Cannot write in property ${key}`);
        }

        target = (target as any)[key];
      } else if (typeof target === "function") {
        const store = (target as () => StoreResult<TStore>)() as Store<TStore>;
        target = (store as any)[key];
      } else {
        target = (target as any)[key];
      }

      if (target === undefined || target === null) {
        (previousTarget as any)[key] = {};
        target = (previousTarget as any)[key];
      }

      previousTarget = target;
    }

    if (target instanceof Store) {
      if (!target.allowedToWrite(targetKey as keyof TStore)) {
        throw new Error(`Cannot write property ${targetKey}`);
      }
    }

    (target as any)[targetKey] = value;

    return value;
  }

  writeEntries(obj: JSONObject): void {
    const entries = Object.entries(obj);

    for (const [key, value] of entries) {
      this.write(key, value);
    }
  }

  entries(): JSONObject {
    const entries = Object.entries(this);
    const result: JSONObject = {};

    for (const [key, value] of entries) {
      if (this.allowedToRead(key as keyof TStore)) {
        result[key] = value;
      }
    }

    return result;
  }
}
