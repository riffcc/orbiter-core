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

import { createOrbiter } from "@/orbiter.js";
import { configIsComplete, exportConfig, getConfig } from "@/config.js";
import { ConfigMode } from "./types.js";

const MACHINE_PREFIX = "MACHINE MESSAGE:";

const baseDir = url.fileURLToPath(new URL("..", import.meta.url));
const packageJsonFile = path.join(baseDir, "./package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

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

  const fFinale = () => {
    const nIpfsConnections = connexions.sfip.length;
    const nConstellationConnections = connexions.constellation.filter(
      (c) => c.infoMembre.idCompte !== connexions.monId && !c.vuÀ,
    ).length;

    logUpdate(
      chalk.yellow(
        `Network connections: ${nIpfsConnections}\nConstellation nodes online: ${nConstellationConnections}`,
      ),
    );
  };

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
      forgetMyId(),
      forgetIpfsConnections(),
      forgetConstellationConnections(),
    ]);
  };
};

yargs(hideBin(process.argv))
  .usage("Usage: $0 <command> [options]")
  .command(["config [--dir <dir>]"],
    "Configure Orbiter",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
        });
    },
    async (argv) => {
      const wheel = ora(chalk.yellow(`Creating config`));
      wheel.start(chalk.yellow("Configuring Orbiter..."));
      const constellation = créerConstellation({
        dossier: argv.dir || ".orbiter",
      });

      await createOrbiter({
        constellation,
      });
      await constellation.fermer();
      wheel?.succeed(chalk.yellow("Orbiter configured. Use `orbiter export-config` to export for use in static deployments."))
      process.exit(0);
    }
  )
  .command(["export-config [--format <format> --dir <dir> --out <out>]"],
    "Export Orbiter config for use in UIs, etc.",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
          default: "./orbiter",
        })
        .option("format", {
          alias: "f",
          describe: "The configuration format to output ('vite' and 'json' available for now).",
          type: "string",
          default: 'vite'
        })
        .option("out", {
          alias: "o",
          describe: "The output env file in which to store the exported configuration.",
          type: "string",
        });
    },
    async (argv) => {
      const wheel = ora();
      wheel.start(chalk.yellow("Obtaining Orbiter config..."));

      const outputFile = argv.out || (argv.format === 'json' ? 'config.json': '.env')

      const config = await getConfig({
        dir: argv.dir
      })
      if (configIsComplete(config)) {
        wheel.info(chalk.yellow("Exporting Orbiter config..."));
      
        const exportedConfig = exportConfig({
          config,
          mode: (argv.format as ConfigMode) || 'vite',
        })
        fs.writeFileSync(outputFile, exportedConfig);
        wheel.succeed(chalk.yellow(`Configuration exported to ${path.resolve(outputFile)}.`))
      } else {
        wheel.fail(chalk.red("Orbiter is not properly configured. Run `orbiter config` first."))
      }
    }
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
          default: ".orbiter",
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
        wheel = ora(chalk.yellow(`Initialising Orbiter`)); // .start()
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
        wheel!.succeed(
          chalk.yellow("Orbiter is running. Press `enter` to close."),
        );
        forgetConnections = await followConnections({ ipa: constellation });
      }
    },
  )
  .command(["authorise [--device <device> --dir <dir>]"],
  "Authorise a new device",
  (yargs) => {
    return yargs
      .option("dir", {
        alias: "d",
        describe: "The directory of the Orbiter node.",
        type: "string",
        default: ".orbiter",
      })
      .option("device", {
        alias: "dev",
        describe:
          "Id of the device to add to this account.",
        type: "string",
      });
  },
  async (argv) => {
    if (!argv.device) throw new Error("Device must be specified.");

    const constellation = créerConstellation({
      dossier: argv.dir,
    });

    await createOrbiter({
      constellation,
    });

    await constellation.ajouterDispositif({
      idDispositif: argv.device
    })
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
