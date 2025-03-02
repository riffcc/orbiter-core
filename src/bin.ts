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

import { createOrbiter, setUpSite } from "@/orbiter.js";
import {
  configIsComplete,
  exportConfig,
  getConfig,
  saveConfig,
} from "@/config.js";
import { ConfigMode } from "./types.js";
import { CONFIG_FILE_NAME, DEFAULT_ORBITER_DIR } from "./consts.js";

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
      const config = await setUpSite({ constellation, ...existingConfig });
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
        .option("regen-site", {
          alias: "rg",
          describe:
            "Whether to generate a new site id controlled by this Orbiter node.",
          type: "boolean",
          default: true,
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
        const overwrite = confirm(
          `An Orbiter configuration file already exists at ${configFilePath}. Do you want to overwrite it?`,
        );
        if (!overwrite) {
          console.log(chalk.red("Configuration file import was cancelled."));
          process.exit(0);
        }
      }
      fs.writeFileSync(configFilePath, JSON.stringify(config));
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
        const peerId = await constellation.obtIdSFIP();
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
