#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ora, { Ora } from "ora";
import chalk from "chalk";
import logUpdate from "log-update";
import fs from "fs";
import path from "path";
import url from "url";
import {
  type types,
  type Constellation,
  type réseau,
  créerConstellation,
} from "@constl/ipa";

import { createOrbiter, setUpSite, validateCategories } from "@/orbiter.js";
import {
  configIsComplete,
  exportConfig,
  getConfig,
  saveConfig,
} from "@/config.js";
import { ConfigMode, Release, releasesFileSchema } from "./types.js";
import { CONFIG_FILE_NAME, DEFAULT_ORBITER_DIR, DEFAULT_VARIABLE_IDS, RELEASES_METADATA_COLUMN } from "./consts.js";
import { confirm } from "@inquirer/prompts";

const MACHINE_PREFIX = "MACHINE MESSAGE:";

const baseDir = url.fileURLToPath(new URL("..", import.meta.url));
const packageJsonFile = path.join(baseDir, "./package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at:", p, "reason:", reason);
});
const sendMachineMessage = ({ message }: { message: { type: string } }) => {
  console.log(MACHINE_PREFIX + JSON.stringify(message));
};

const followConnections = async ({ ipa }: { ipa: Constellation }) => {
  const connexions: {
    sfip: { pair: string; adresses: string[] }[];
    constellation: réseau.statutMembre[];
    monId?: string;
  } = {
    sfip: [],
    constellation: [],
  };
  let now = Date.now();

  const fFinale = () => {
    const nIpfsConnections = connexions.sfip.length;
    const nConstellationConnections = connexions.constellation.filter(
      (c) => c.infoMembre.idCompte !== connexions.monId && c.vuÀ && c.vuÀ - now,
    ).length;

    logUpdate(
      chalk.yellow(
        `Network connections: ${nIpfsConnections}\nConstellation nodes online: ${nConstellationConnections}\n${JSON.stringify(connexions.sfip, undefined, 2)}`,
      ),
    );
  };

  const timeout = setInterval(() => {
    now = Date.now();
    fFinale();
  });

  const forgetNow = () => clearInterval(timeout);

  const forgetMyId = await ipa.suivreIdCompte({
    f: (id) => (connexions.monId = id),
  });
  const forgetIpfsConnections = await ipa.réseau.suivreConnexionsPostesSFIP({
    f: (x) => {
      connexions.sfip = x;
      fFinale();
    },
  });
  const forgetConstellationConnections =
    await ipa.réseau.suivreConnexionsMembres({
      f: (x) => {
        connexions.constellation = x;
        fFinale();
      },
    }); // TODO: check specifically for Orbiter instances on the Constellation network
  return async () => {
    await Promise.all([
      forgetNow(),
      forgetMyId(),
      forgetIpfsConnections(),
      forgetConstellationConnections(),
    ]);
  };
};

yargs(hideBin(process.argv))
  .usage("Usage: $0 <command> [options]")
  .command(
    ["config [--dir <dir>]"],
    "Configure Orbiter",
    (yargs) => {
      return yargs.option("dir", {
        alias: "d",
        describe: "The directory of the Orbiter node.",
        type: "string",
        default: DEFAULT_ORBITER_DIR,
      })
      .option("ignore-defaults", {
        alias: "i",
        description: "Ignore defaults and regenerate all configuration.",
        type: "boolean",
      });
    },
    async (argv) => {
      const wheel = ora(chalk.yellow(`Starting Orbiter...`));
      const dir = argv.dir || DEFAULT_ORBITER_DIR;

      const constellation = créerConstellation({
        dossier: dir,
      });
      wheel.start(chalk.yellow("Configuring Orbiter..."));

      const existingConfig = await getConfig({ dir });
      if (!argv.ignoreDefaults)
        existingConfig.variableIds = {...DEFAULT_VARIABLE_IDS, ...existingConfig.variableIds}
      const categoriesData = await validateCategories();
      const config = await setUpSite({ constellation, categoriesData,  ...existingConfig });
      await saveConfig({ dir, config, mode: "json" });
      await constellation.fermer();
      wheel?.succeed(
        chalk.yellow(
          "Orbiter configured. Use `orb export-config` to export for use in static deployments.",
        ),
      );
      process.exit(0);
    },
  )
  .command(
    ["export-config [--format <format> --dir <dir> --out <out>]"],
    "Export Orbiter config for use in UIs, etc.",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .option("format", {
          alias: "f",
          describe:
            "The configuration format to output ('vite' and 'json' available for now).",
          type: "string",
          default: "vite",
        })
        .option("out", {
          alias: "o",
          describe:
            "The output env file in which to store the exported configuration.",
          type: "string",
        });
    },
    async (argv) => {
      const wheel = ora();
      wheel.start(chalk.yellow("Obtaining Orbiter config..."));

      const outputFile =
        argv.out || (argv.format === "json" ? "config.json" : ".env");

      const config = await getConfig({
        dir: argv.dir,
      });
      if (configIsComplete(config)) {
        wheel.info(chalk.yellow("Exporting Orbiter config..."));

        const exportedConfig = exportConfig({
          config,
          mode: (argv.format as ConfigMode) || "vite",
        });
        fs.writeFileSync(outputFile, exportedConfig);
        wheel.succeed(
          chalk.yellow(
            `Configuration exported to ${path.resolve(outputFile)}.`,
          ),
        );
      } else {
        wheel.fail(
          chalk.red(
            "Orbiter is not properly configured. Run `orb config` first.",
          ),
        );
      }
    },
  )
  .command(
    ["import-config [--dir <dir> --file <file> -regen-site]"],
    "Import Orbiter config",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .option("file", {
          alias: "f",
          describe: "The config file to import.",
          type: "string",
        })
        .option("same-site", {
          alias: "s",
          describe:
            "Whether to keep the same site id or else generate a new site id controlled by this Orbiter node.",
          type: "boolean",
        });
    },
    async (argv) => {
      const { dir, file, regenSite } = argv;
      if (!file)
        throw new Error("Configuration file to import must be specified.");

      const config = await getConfig({ dir: file });
      if (regenSite) {
        delete config.siteId;
      }
      const configFilePath = path.join(dir, CONFIG_FILE_NAME);
      if (fs.existsSync(configFilePath)) {
        const overwrite = await confirm({
          message: `An Orbiter configuration file already exists at ${configFilePath}. Do you want to overwrite it?`,
        });
        if (!overwrite) {
          console.log(chalk.red("Configuration file import was cancelled."));
          process.exit(0);
        }
      }
      fs.writeFileSync(configFilePath, JSON.stringify(config, undefined, 2));
    },
  )
  .command(
    ["run [-m] [--dir <dir>]"],
    "Start orbiter",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .option("machine", {
          alias: "m",
          describe:
            "Machine communication mode (useful for programmatic access).",
          type: "boolean",
        });
    },
    async (argv) => {
      let wheel: Ora | undefined = undefined;
      let forgetConnections: types.schémaFonctionOublier | undefined =
        undefined;

      if (argv.machine) {
        sendMachineMessage({ message: { type: "STARTING ORBITER" } });
      } else {
        wheel = ora();
        wheel.start(chalk.yellow(`Initialising Orbiter`));
      }

      const constellation = créerConstellation({
        dossier: argv.dir,
      });

      await createOrbiter({
        constellation,
      });

      process.stdin.on("data", async () => {
        if (argv.machine) {
          sendMachineMessage({ message: { type: "Closing Orbiter" } });
        } else {
          wheel?.start(chalk.yellow("Closing Orbiter..."));
        }
        try {
          await forgetConnections?.();
          await constellation.fermer();
        } finally {
          if (argv.machine) {
            sendMachineMessage({ message: { type: "CLOSED" } });
          } else {
            wheel?.succeed(chalk.yellow("Orbiter closed."));
          }
          process.exit(0);
        }
      });
      if (argv.machine) {
        sendMachineMessage({
          message: { type: "ORBITER READY" },
        });
      } else {
        const peerId = await constellation.obtIdLibp2p();
        wheel!.succeed(
          chalk.yellow(
            `Orbiter is running. Press \`enter\` to close.\nPeer id: ${peerId}`,
          ),
        );
        forgetConnections = await followConnections({ ipa: constellation });
      }
    },
  )
  .command(
    ["authorise <account> [--dir <dir>]"],
    "Authorise a new device",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .positional("account", {
          describe: "Id of the account to add to this account.",
          type: "string",
        });
    },
    async (argv) => {
      if (!argv.account) throw new Error("Account must be specified.");

      const wheel = ora(chalk.yellow(`Starting Orbiter`));
      const constellation = créerConstellation({
        dossier: argv.dir,
      });

      const { orbiter } = await createOrbiter({
        constellation,
      });

      wheel.start(chalk.yellow("Authorising account..."));
      await orbiter.inviteModerator({
        userId: argv.account,
        admin: true,
      });

      wheel.start(chalk.yellow("Cleaning things up..."));
      await constellation.fermer();

      wheel.succeed(chalk.yellow("All done!"));
      process.exit(0);
    },
  )
  .command(
    ["subscribe <siteId> [--siteName <siteName> --dir <dir>]"],
    "Subscribe to a new site",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .option("siteName", {
          describe: "Name for the site to subscribe.",
          type: "string",
        })
        .positional("siteId", {
          describe: "The site id to subscribe",
          type: "string",
        });
    },
    async (argv) => {
      if (!argv.siteId) throw new Error("Site Id must be specified.");

      const wheel = ora(chalk.yellow(`Starting Orbiter`));
      const constellation = créerConstellation({
        dossier: argv.dir,
      });

      const { orbiter } = await createOrbiter({
        constellation,
      });

      wheel.start(chalk.yellow("Authorising account..."));
      await orbiter.trustSite({
        siteId: argv.siteId,
        siteName: argv.siteName ?? argv.siteId,
      });

      wheel.start(chalk.yellow("Cleaning things up..."));
      await constellation.fermer();

      wheel.succeed(chalk.yellow("All done!"));
      process.exit(0);
    },
  )
  .command(
    ["unsubscribe <siteId> [--dir <dir>]"],
    "Unsubscribe to a site",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .positional("siteId", {
          describe: "The site id to unsubscribe",
          type: "string",
        });
    },
    async (argv) => {
      if (!argv.siteId) throw new Error("Site Id must be specified.");

      const wheel = ora(chalk.yellow(`Starting Orbiter`));
      const constellation = créerConstellation({
        dossier: argv.dir,
      });

      const { orbiter } = await createOrbiter({
        constellation,
      });

      wheel.start(chalk.yellow("Authorising account..."));
      await orbiter.untrustSite({
        siteId: argv.siteId
      });

      wheel.start(chalk.yellow("Cleaning things up..."));
      await constellation.fermer();

      wheel.succeed(chalk.yellow("All done!"));
      process.exit(0);
    },
  )
  .command(
    ["upload-releases <file> [--dir <dir>]"],
    "Upload releases from a JSON File",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: DEFAULT_ORBITER_DIR,
        })
        .positional("file", {
          describe: "The file path of the JSON File with the releases data.",
          type: "string",
        });
    },
    async (argv) => {
      if (!argv.file) throw new Error("JSON File path must be specified.");
  
      const wheel = ora(chalk.yellow(`Starting Orbiter`));
      const constellation = créerConstellation({
        dossier: argv.dir,
      });
  
      const { orbiter } = await createOrbiter({
        constellation,
      });
  
      // Check if JSON file exists and read it
      wheel.start(chalk.yellow("Reading and validating releases file..."));
      const fs = await import("fs");
      const path = await import("path");
      const Ajv = (await import("ajv")).default;
  
      const filePath = path.resolve(argv.file);
      if (!fs.existsSync(filePath)) {
        wheel.fail(chalk.red(`File not found: ${filePath}`));
        await constellation.fermer();
        process.exit(1);
      }
  
      let releasesData: Release<Record<string, unknown>>[];
      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const jsonData = JSON.parse(fileContent);
  
        // Validate with AJV
        const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
        const validate = ajv.compile(releasesFileSchema);
        const valid = validate(jsonData);
  
        if (!valid) {
          const errors = validate.errors?.map(err =>
            `${err.instancePath}: ${err.message}`
          ).join("\n");
          throw new Error(`Validation failed:\n${errors}`);
        }
  
        releasesData = jsonData as Release<Record<string, unknown>>[];
      } catch (error) {
        wheel.fail(chalk.red(`Error processing JSON file: ${error.message}`));
        await constellation.fermer();
        process.exit(1);
      }
  
      // Upload releases
      wheel.start(chalk.yellow(`Uploading ${releasesData.length} releases...`));
      try {
        await Promise.all(
          releasesData.map(async (releaseData) => {
            // Convert metadata object to string if present
            const release: Release = {
              ...releaseData,
              [RELEASES_METADATA_COLUMN]: releaseData[RELEASES_METADATA_COLUMN]
                ? JSON.stringify(releaseData[RELEASES_METADATA_COLUMN])
                : undefined,
            };
            await orbiter.addRelease(release);
          })
        );
        wheel.succeed(chalk.yellow(`Successfully uploaded ${releasesData.length} releases`));
      } catch (error) {
        wheel.fail(chalk.red(`Error uploading releases: ${error.message}`));
        await constellation.fermer();
        process.exit(1);
      }
  
      // Cleanup
      wheel.start(chalk.yellow("Cleaning things up..."));
      await constellation.fermer();

      wheel.succeed(chalk.yellow("All done!"));
      process.exit(0);
    },
  )
  .command(
    ["version"],
    "Get orbiter version",
    (yargs) => {
      return yargs;
    },
    async () => {
      console.log(packageJson.version);
    },
  )
  .demandCommand()
  .help()
  .epilog("Source code and bug reports: https://github.com/riffcc/orbiter")
  .scriptName("orb")
  .parse();
