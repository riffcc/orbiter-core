import { DatabaseConfig } from "./types";
import fs from "fs";
import path from "path";

let globalDbConfig: DatabaseConfig | undefined;

/**
 * Patches the Constellation library to use RocksDB with multi-process support
 * This must be called before initializing Constellation
 */
export function patchConstellationConfig(dbConfig: DatabaseConfig): void {
  globalDbConfig = dbConfig;

  const configDir =
    process.env.ORBITER_CONFIG_DIR || path.join(process.cwd(), ".orbiter");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, "db-config.json");
  fs.writeFileSync(configPath, JSON.stringify(dbConfig));

  process.env.ORBITDB_ROCKSDB_MULTIPROCESS = dbConfig.multiProcess
    ? "true"
    : "false";
  process.env.ORBITDB_STORAGE_ADAPTER =
    dbConfig.type === "rocksdb" ? "rocksdb" : "level";
}

/**
 * Gets the current global database configuration
 */
export function getGlobalDbConfig(): DatabaseConfig | undefined {
  return globalDbConfig;
}
