import { Level } from "level";
import { AbstractLevelDOWN } from "abstract-leveldown";

interface RocksDBOptions {
  valueEncoding?: string;
  keyEncoding?: string;
  multiProcess?: boolean;
}

/**
 * Creates a RocksDB adapter with multi-process support
 */
export function createRocksDBAdapter(location: string, options: RocksDBOptions = {}): AbstractLevelDOWN<any, any> {
  return new Level(location, {
    ...options,
    keyEncoding: options.keyEncoding || "utf8",
    valueEncoding: options.valueEncoding || "json",
    db: require("rocksdb"),
  }) as unknown as AbstractLevelDOWN<any, any>;
}
