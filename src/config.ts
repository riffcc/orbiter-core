import {
  ConfigMode,
  VariableIds,
  orbiterConfigSchema,
  possiblyIncompleteOrbiterConfigSchema,
  type OrbiterConfig,
  type PossiblyIncompleteOrbiterConfig,
} from "./types.js";

import {constantCase} from 'change-case';
import {
  isBrowser,
  isElectronRenderer,
  isReactNative,
  isWebWorker,
} from "wherearewe";
import Ajv from "ajv";

import { CONFIG_FILE_NAME } from "./consts.js";

const ajv = new Ajv();
const validateCompleteConfig = ajv.compile(orbiterConfigSchema)
const validateConfig = ajv.compile(possiblyIncompleteOrbiterConfigSchema);

export const configIsComplete = (config: unknown): config is OrbiterConfig => {
  if (validateCompleteConfig(config)) return true;
  return false;
};

export const getConfig = async ({
  dir,
}: {
  dir: string;
}): Promise<PossiblyIncompleteOrbiterConfig> => {
  if (isBrowser || isElectronRenderer || isReactNative || isWebWorker) {
    throw new Error(
      "The `getConfig` function is only available in Node and Electron main environments.",
    );
  }
  const { existsSync, readFileSync } = await import("fs");
  const { join } = await import("path");
  const configFilePath = join(dir, CONFIG_FILE_NAME);
  if (existsSync(configFilePath)) {
    const data = readFileSync(configFilePath);
    try {
      const jsonConfig = JSON.parse(new TextDecoder().decode(data)) as unknown;
      if (validateConfig(jsonConfig)) {
        return jsonConfig;
      } else {
        return {};
      }
    } catch {
      return {};
    }
  }
  return {};
};

export const saveConfig = async ({
  dir,
  config,
  mode,
}: {
  dir: string;
  config: OrbiterConfig;
  mode: ConfigMode;
}) => {
  const configFileText = exportConfig({ config, mode });
  if (isBrowser || isElectronRenderer || isReactNative || isWebWorker) {
    throw new Error(
      "The `saveConfig` function is only available in Node and Electron main environments.",
    );
  }
  const { writeFileSync } = await import("fs");
  const { join } = await import("path");
  const configFilePath = join(dir, CONFIG_FILE_NAME);
  writeFileSync(configFilePath, configFileText);
};

export const exportConfig = ({
  config,
  mode,
}: {
  config: OrbiterConfig;
  mode: ConfigMode;
}): string => {
  if (mode === "vite") return exportViteConfig({ config });
  else if (mode === 'json') return exportJsonConfig({ config });
  else throw new Error(`Unknown exportation mode ${mode}.`);
};

export const exportViteConfig = ({
  config,
}: {
  config: OrbiterConfig;
}): string => {
  const { siteId, swarmId, variableIds } = config;
  let envFileText = '# The address below should be regenerated for each Orbiter site. If you are setting up an independent site, erase the value below and run the site in development mode (`pnpm dev`) to automatically regenerate. \n' +
  'VITE_SITE_ID=' + siteId +
  '\n';
  const variableIdsList = Object.keys(variableIds).map(
    k => `VITE_${constantCase(k)}_ID=${variableIds[k as keyof VariableIds]}`,
  );

  envFileText +=
    '# These should ideally stay the same for all Orbiter site. Changing these will create a parallel network and thereby keep your lens from syncing and interacting with the main network.\n' +
    'VITE_SWARM_ID=' + swarmId +
    '\n' + 
    '\n' +
    variableIdsList.join('\n') +
    '\n'
  ;
  return envFileText;
};

export const exportJsonConfig = ({
    config,
  }: {
    config: OrbiterConfig;
  }): string => {
    return JSON.stringify(config, undefined, 2);
  }
