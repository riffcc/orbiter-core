import { Level } from "level";
import { AbstractLevel } from "abstract-level";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rocksdb = require("rocksdb");

interface RocksDBOptions {
  valueEncoding?: string;
  keyEncoding?: string;
  multiProcess?: boolean;
}

/**
 * Creates a RocksDB adapter with multi-process support
 */
export function createRocksDBAdapter(
  location: string,
  options: RocksDBOptions = {},
): AbstractLevel<string, unknown> {
  return new Level(location, {
    ...options,
    keyEncoding: options.keyEncoding || "utf8",
    valueEncoding: options.valueEncoding || "json",
    db: rocksdb,
  }) as unknown as AbstractLevel<string, unknown>;
}
