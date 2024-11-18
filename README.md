# Orbiter core
[![Orbiter core tests](https://github.com/riffcc/orbiter-core/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/riffcc/orbiter-core/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/riffcc/orbiter-core/graph/badge.svg?token=D41D2XBE0P)](https://codecov.io/gh/riffcc/orbiter-core)

This is the source code for the Orbiter network. The UI code is in a [separate repository](https://github.com/riffcc/orbiter). Use the present repository as a dependency in your UI code for Orbiter-based apps, or else as a command-line tool for managing Orbiter Lens on a server.

## Programmatic use
We recommend using [`pnpm`](https://pnpm.io) to install Orbiter in your projects.

### Installation
```sh
$ pnpm install @riffcc/orbiter
```

### Use
Orbiter must be initialised with an instance of [Constellation](https://docu.réseau-constellation.ca), which is used for distributed data storage and networking. Constellation itself  is based on OrbitDB, Helia and Libp2p.

```ts
import { créerConstellation } from "@constl/ipa";
import { createOrbiter } from "@riffcc/orbiter";

const constellation = créerConstellation();
const orbiter = createOrbiter({ constellation });

// Do orbiter stuff...
```

Untill complete documentation is ready, refer to the [orbiter.ts](https://github.com/riffcc/orbiter-core/blob/main/src/orbiter.ts) code to see available functions.


## Command line client
This package also comes with a command-line client, useful for setting up Orbiter lenses on servers (e.g., DigitalOcean).

### Installation
To use the command-line client, first install Orbiter as a global pnpm package.

```sh
$ pnpm install -g @riffcc/orbiter
```

### Use
Use `orb config` to set up a lens and generate the required config. The `dir` option specifies the path to the root folder for the Orbiter lens in which all data and keys related to the lens will be stored. Default directory is `./orbiter`.

```sh
$ orb config --dir "path/to/lens"
```

Use `orb expor-config` to  export the generated config to use in UI development. The `format` option can be `"vite"` or `"json"`.

```sh
$ orb export-config --dir "path/to/lens" --format "vite"
```

Use `orb lens` to run the configured lens.

```sh
$ orb run --dir "path/to/lens"
```