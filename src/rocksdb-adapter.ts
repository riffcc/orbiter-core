import { Level } from "level";
import { AbstractLevel } from "abstract-level";

interface RocksDBOptions {
  valueEncoding?: string;
  keyEncoding?: string;
  multiProcess?: boolean;
}

/**
 * Creates a RocksDB adapter with multi-process support
 * Uses the native RocksDB backend through abstract-level
 */
export function createRocksDBAdapter(
  location: string,
  options: RocksDBOptions = {},
): AbstractLevel<string, unknown> {
  return new Level(location, {
    ...options,
    keyEncoding: options.keyEncoding || "utf8",
    valueEncoding: options.valueEncoding || "json",
  }) as unknown as AbstractLevel<string, unknown>;
}
