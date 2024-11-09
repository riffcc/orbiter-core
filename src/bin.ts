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
const MACHINE_PREFIX = "MACHINE MESSAGE:"

const baseDir = url.fileURLToPath(new URL("..", import.meta.url));
const packageJsonFile = path.join(baseDir, "./package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

const sendMachineMessage = ({ message }: { message: {type: string} }) => {
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
    const nConstellationConnections = connexions.constellation.filter((c) => c.infoMembre.idCompte !== connexions.monId && !c.vuÀ).length;

    logUpdate(
      chalk.yellow(
        // eslint-disable-next-line no-irregular-whitespace
        `Network connections: ${nIpfsConnections}\nConstellation nodes online: ${nConstellationConnections}`,
      ),
    );
  };

  const forgetMyId = await ipa.suivreIdCompte({
    f: id => connexions.monId = id,
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
    });  // TODO: check specifically for Orbiter instances on the Constellation network
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
  .command(
    ["run [-m] [--dir <dir>]"],
    "Start orbiter",
    (yargs) => {
      return yargs
        .option("dir", {
          alias: "d",
          describe: "The directory of the Orbiter node.",
          type: "string",
        })
        .option("machine", {
          alias: "m",
          describe: "Machine communication mode (useful for programmatic access).",
          type: "boolean",
        });
    },
    async (argv) => {
      let wheel: Ora | undefined = undefined;
      let oublierConnexions: types.schémaFonctionOublier | undefined =
        undefined;

      if (argv.machine) {
        sendMachineMessage({ message: { type: "STARTING ORBITER" } });
      } else {
        wheel = ora(chalk.yellow(`Initialising Orbiter`));  // .start()
      }

      const constellation = créerConstellation({
        dossier: argv.dir || '.orbiter',
      })

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
          await oublierConnexions?.();
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
          chalk.yellow("Orbiter is running. Press any key to close."),
        );
        oublierConnexions = await followConnections({ ipa: constellation });
      }
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
  .help("help", "Get command line help")
  .epilog(
    "Source code and bug reports: https://github.com/riffcc/orbiter",
  )
  .parse();