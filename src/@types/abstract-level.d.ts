declare module "abstract-level" {
  export interface AbstractLevel<K = unknown, V = unknown> {
    // Basic interface for AbstractLevel
    open(
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    close(callback: (error?: Error) => void): void;
    put(
      key: K,
      value: V,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    get(
      key: K,
      options: Record<string, unknown>,
      callback: (error?: Error, value?: V) => void,
    ): void;
    del(
      key: K,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    batch(
      operations: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    iterator(options: Record<string, unknown>): unknown;
  }
}

declare module "level" {
  import { AbstractLevel } from "abstract-level";

  export interface LevelOptions {
    keyEncoding?: string;
    valueEncoding?: string;
    db?: unknown;
    [key: string]: unknown;
  }

  export class Level<K = unknown, V = unknown> implements AbstractLevel<K, V> {
    constructor(location: string, options?: LevelOptions);
    open(
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    close(callback: (error?: Error) => void): void;
    put(
      key: K,
      value: V,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    get(
      key: K,
      options: Record<string, unknown>,
      callback: (error?: Error, value?: V) => void,
    ): void;
    del(
      key: K,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    batch(
      operations: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
      callback: (error?: Error) => void,
    ): void;
    iterator(options: Record<string, unknown>): unknown;
  }
}
