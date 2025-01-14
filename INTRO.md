# Introduction to Orbiter
Orbiter is an open-source platform and network for sharing free (in the legal sense) media content.

# Philosophy and structure
Orbiter is a *fully distributed* software, **not** a decentralised software. This distinction is often confusing for blockchain experts, who are used to decentralised systems where end-users use lightweight web clients to access and submit data to a server. This is very similar to a centralised set-up, with the notable exception that there are many peer servers, generally not under the control of the same entity, that are responsible for storing and validating network data. This is necessary because decentralised software is very heavy from both a memory and a computational perspective, which makes it impossible to host the entire peer-to-peer software and data on end-users' devices.

In contrast, **Orbiter and other fully distributed peer-to-peer software are lightweight enough to reasonably fit on an end-user's device.** This makes it possible for end-users to directly share network data with each other, meaning that **the network becomes stronger and more performant as more users join**, since the workload of providing content is distributed amongst a larger number of peers. This is the opposite of centralised ([and even distributed](https://en.wikipedia.org/wiki/CryptoKitties)) systems, where higher user traffic leads to slower response times and higher costs.

# What is a lens?
An Orbiter *lens* is a website following the Orbiter protocol. For the tech-savvy, this protocol is based on [Constellation](https://docu.réseau-constellation.ca), itself based on [OrbitDB](https://github.com/orbitdb/orbit-db) and [IPFS](https://docs.ipfs.tech/).

Since there are no servers in a distributed network, content is distributed directly between participating peers. **This means that Orbiter has no front-end and back-end**, the code being instead divided into the [GUI](https://github.com/riffcc/orbiter) and the [networking](https://github.com/riffcc/orbite-core) code, both of which are included in the website's front-end for all end-users. 

There are, however, a few caveats - namely, that traditional services provided by servers such as authorisation and content storage, must still be implemented. The first is controlled by the founding peer behind the lens, while the latter are often provided by the same machine but could, in theory, be provided by other, perhaps unrelated, peers in the network who happen to be interested in the content provided on the lens.

> [!TIP]  
> Since there are no servers involved, the actual website GUI providing end-users with access to a lens can be provided as a static web page (more to follow later).

A *lens* is therefore, quite simply, a peer in the Orbiter network who has authorisation to modify content shown in the associated website. This includes choosing authorisation modes (invitation-only or else open permissions for user-uploaded content), as well as featuring particular media on the home page. 

> [!IMPORTANT]  
> While all Orbiter peers are technically equal, in practice, some peers will have better connectivity and more storage memory than others. For this reason, all production Orbiter lens should be set up on Node.js or Electron versions of Orbiter; browser peers could theoretically also be used to set up lenses but would in practice be severly limited in bandwidth and memory.

# Setting up a lens
First of all, choose a machine with sufficient storage to pin all the media files you expect to share on your Orbiter lens. This could be your own server, which may have a screen monitor, or else a remote server such as [DigitalOcean](https://www.digitalocean.com/), which certainly won't. This tutorial will cover both cases.

## Node.js lens
Install an up-to-date version of Node.js and pnpm and install Orbiter globally with 

```bash
$ pnpm install -g @riffcc/orbiter
```

Use `orb config` to set up a lens and generate the required config. The `dir` option specifies the path to the root folder for the Orbiter lens in which all data and keys related to the lens will be stored. Default directory is `./orbiter`.

```sh
$ orb config [--dir "path/to/lens"]
```

Use `orb lens` to run the configured lens on your machine.

```sh
$ orb run [--dir "path/to/lens"]
```

## Electron lens
If the machine on which you wish to set up your lens has a screen, you can opt to use the installable (Electron) version of Orbiter instead. First, download the [installable Orbiter app](https://github.com/riffcc/orbiter/releases), once it is available, and install it on your machine. Simply opening the app will create your own Orbiter lens.

> [!IMPORTANT]  
> This option is included for completeness but is not *quite* ready yet due to a few compilation bugs taht should soon be fixed.

## Publishing the site
Once we have a running lens, we can commpile the static site which we will distribute to end-users.

Firstly, clone the default Orbiter UI, or else set up your own UI project with Vite.js.
```sh
$ git clone https://github.com/riffcc/orbiter
```

Use `orb expor-config` to  export the generated configuration to use in UI development. `out` will default to the current working directory.

```sh
$ orb export-config [--dir "path/to/lens"] [--out "path/to/uiCodeRepo/.env"]
```

## Authorisation and access
If you created your Orbiter lens in Node.js on a screenless server, you will probably nonetheless want to access administrative capacities of the peer through the user interface in order to moderate the site or feature content. This can be done by adding your browser peer as a linked device to the account that manages your lens as set up above.

Firstly, open a browser and navigate to the domain at which you have published your Orbiter UI static website.

> [!WARNING]  
> This should be done with a website published over https. Connectivity in Orbiter will not work on `localhost` on at least Firefox, and, in any case, the private keys of the peer to which you will be granting administrator access to your lens **will be linked to the browser and domain name of the site from which you access the website**. `localhost` should only be used for testing purposes.

On the `Account` tab, view and copy your device ID.

Next, on your Orbiter lens, run the following command:

```sh
$ orb authorise  --device <deviceId> [--dir "path/to/lens"]
```

Your browser peer now has administrator access to your Orbiter lens and will be able to perform administrative actions, such as changing the site's sharing parameters (open or invitation-only), inviting or blocking users or specific content, and sharing or featuring content.

# Following other sites
Your Orbiter lens can now also follow other sites. In practical terms, this means that content shared on another site following the Orbiter protocol will also be visible to your users, contingent on the content in question passing your site's content moderation filters. To do this, navigate to another Orbiter site and copy that site's unique ID. On your lens' administrator page, paste this ID into the `Trust site` field to start mirroring content from that site. Note that this action can always be reversed if you later change your mind. 