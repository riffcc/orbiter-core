import fs from "fs";
import path from "path";
import { DatabaseConfig } from "./types";

/**
 * Configures OrbitDB to use our database configuration
 */
export function configureOrbitDBStore(): void {
  try {
    const configDir =
      process.env.ORBITER_CONFIG_DIR || path.join(process.cwd(), ".orbiter");
    const configPath = path.join(configDir, "db-config.json");

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(
        fs.readFileSync(configPath, "utf-8"),
      ) as DatabaseConfig;

      if (config.type === "rocksdb") {
        process.env.ORBITDB_ROCKSDB_MULTIPROCESS = config.multiProcess
          ? "true"
          : "false";
        process.env.ORBITDB_STORAGE_ADAPTER = "leveldb";
      }
    }
  } catch (err) {
    console.error("Error configuring OrbitDB store:", err);
  }
}

configureOrbitDBStore();
