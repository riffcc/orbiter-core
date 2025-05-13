import { TypedEmitter } from "tiny-typed-emitter";

import { Lock } from "semaphore-async-await";

import type { Constellation, bds, tableaux, types } from "constl-ipa-fork";
import {
  faisRien,
  ignorerNonDéfinis,
  suivreFonctionImbriquée,
  uneFois,
} from "@constl/utils-ipa";
import type { JSONSchemaType } from "ajv";

import {
  BLOCKED_RELEASES_RELEASE_ID_COLUMN,
  BLOCKED_RELEASES_TABLE_KEY,
  COLLECTIONS_AUTHOR_COLUMN,
  COLLECTIONS_CATEGORY_COLUMN,
  COLLECTIONS_DB_TABLE_KEY,
  COLLECTIONS_METADATA_COLUMN,
  COLLECTIONS_NAME_COLUMN,
  COLLECTIONS_RELEASES_COLUMN,
  COLLECTIONS_THUMBNAIL_COLUMN,
  CONTENT_CATEGORIES_CATEGORY_ID,
  CONTENT_CATEGORIES_DISPLAY_NAME,
  CONTENT_CATEGORIES_FEATURED,
  CONTENT_CATEGORIES_METADATA_SCHEMA,
  CONTENT_CATEGORIES_TABLE_KEY,
  DEFAULT_CONTENT_CATEGORIES,
  FEATURED_RELEASES_END_TIME_COLUMN,
  FEATURED_RELEASES_RELEASE_ID_COLUMN,
  FEATURED_RELEASES_START_TIME_COLUMN,
  FEATURED_PROMOTED_COLUMN,
  FEATURED_RELEASES_TABLE_KEY,
  RELEASES_AUTHOR_COLUMN,
  RELEASES_CATEGORY_COLUMN,
  RELEASES_COVER_COLUMN,
  RELEASES_DB_TABLE_KEY,
  RELEASES_FILE_COLUMN,
  RELEASES_METADATA_COLUMN,
  RELEASES_NAME_COLUMN,
  RELEASES_THUMBNAIL_COLUMN,
  TRUSTED_SITES_NAME_COL,
  TRUSTED_SITES_SITE_ID_COL,
  TRUSTED_SITES_TABLE_KEY,
  DEFAULT_VARIABLE_IDS,
} from "./consts.js";
import type {
  BlockedRelease,
  Collection,
  CollectionWithId,
  FeaturedRelease,
  Release,
  ReleaseWithId,
  TrustedSite,
  VariableIds,
  PossiblyIncompleteVariableIds,
  ContentCategory,
  ContentCategoryMetadataField,
  ContentCategoryWithId,
} from "./types.js";
import { categoriesFileSchema, variableIdKeys } from "./types.js";
import { removeUndefined } from "./utils.js";
import { configIsComplete, getConfig } from "./config.js";
import Ajv from "ajv";

type forgetFunction = () => Promise<void>;

interface OrbiterEvents {
  "site configured": (args: {
    siteId: string;
    variableIds: VariableIds;
  }) => void;
  releases: (
    releases: { release: ReleaseWithId; contributor: string; site: string }[],
    isPartial: boolean,
  ) => void;
  collections: (
    collections: {
      collection: CollectionWithId;
      contributor: string;
      site: string;
    }[],
    isPartial: boolean,
  ) => void;
  featured: (
    featured: { id: string; featured: FeaturedRelease; site: string }[],
    isPartial: boolean,
  ) => void;
  syncError: (
    error: Error, 
    source: 'releases' | 'collections' | 'site' | 'connection'
  ) => void;
  syncProgress: (
    progress: { 
      total: number; 
      loaded: number; 
      type: 'releases' | 'collections' | 'featured' 
    }
  ) => void;
  syncComplete: (
    type: 'releases' | 'collections' | 'featured'
  ) => void;
}

type RootDbSchema = {
  swarmId: string;
  modDb: string;
};
const ROOT_DB_JSON_SCHEMA: JSONSchemaType<Partial<RootDbSchema>> = {
  type: "object",
  properties: {
    modDb: { type: "string", nullable: true },
    swarmId: { type: "string", nullable: true },
  },
  required: [],
};

const OrbiterSiteDbSchema: JSONSchemaType<{ modDb: string; swarmId: string }> =
  {
    type: "object",
    properties: {
      modDb: {
        type: "string",
      },
      swarmId: {
        type: "string",
      },
    },
    required: ["modDb", "swarmId"],
  };

const getSwarmDbSchema = ({
  releasesFileVar,
  releasesCategoryVar,
  releasesThumbnailVar,
  releasesCoverVar,
  releasesAuthorVar,
  releasesContentNameVar,
  releasesMetadataVar,
  collectionsNameVar,
  collectionsCategoryVar,
  collectionsReleasesVar,
  collectionsAuthorVar,
  collectionsMetadataVar,
  collectionsThumbnailVar,
  swarmId,
}: {
  releasesFileVar: string;
  releasesCategoryVar: string;
  releasesThumbnailVar: string;
  releasesCoverVar: string;
  releasesAuthorVar: string;
  releasesContentNameVar: string;
  releasesMetadataVar: string;
  collectionsNameVar: string;
  collectionsCategoryVar: string;
  collectionsReleasesVar: string;
  collectionsAuthorVar: string;
  collectionsMetadataVar: string;
  collectionsThumbnailVar: string;
  swarmId: string;
}): bds.schémaSpécificationBd => {
  return {
    licence: "ODbl-1_0",
    nuées: [swarmId],
    tableaux: [
      {
        cols: [
          {
            idVariable: releasesFileVar,
            idColonne: RELEASES_FILE_COLUMN,
          },
          {
            idVariable: releasesCategoryVar,
            idColonne: RELEASES_CATEGORY_COLUMN,
          },
          {
            idVariable: releasesThumbnailVar,
            idColonne: RELEASES_THUMBNAIL_COLUMN,
          },
          {
            idVariable: releasesCoverVar,
            idColonne: RELEASES_COVER_COLUMN,
          },
          {
            idVariable: releasesAuthorVar,
            idColonne: RELEASES_AUTHOR_COLUMN,
          },
          {
            idVariable: releasesContentNameVar,
            idColonne: RELEASES_NAME_COLUMN,
          },
          {
            idVariable: releasesMetadataVar,
            idColonne: RELEASES_METADATA_COLUMN,
          },
          {
            idVariable: releasesCoverVar,
            idColonne: RELEASES_COVER_COLUMN,
          },
        ],
        clef: RELEASES_DB_TABLE_KEY,
      },
      {
        cols: [
          {
            idVariable: collectionsNameVar,
            idColonne: COLLECTIONS_NAME_COLUMN,
          },
          {
            idVariable: collectionsCategoryVar,
            idColonne: COLLECTIONS_CATEGORY_COLUMN,
          },
          {
            idVariable: collectionsReleasesVar,
            idColonne: COLLECTIONS_RELEASES_COLUMN,
          },
          {
            idVariable: collectionsAuthorVar,
            idColonne: COLLECTIONS_AUTHOR_COLUMN,
          },
          {
            idVariable: collectionsMetadataVar,
            idColonne: COLLECTIONS_METADATA_COLUMN,
          },
          {
            idVariable: collectionsThumbnailVar,
            idColonne: COLLECTIONS_THUMBNAIL_COLUMN,
          },
        ],
        clef: COLLECTIONS_DB_TABLE_KEY,
      },
    ],
  };
};

export const validateCategories = async ({ dir }: { dir: string }) => {
  let categoriesData = DEFAULT_CONTENT_CATEGORIES;
  const { readFileSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const categoriesPath = join(dir, "contentCategories.json");

  if (existsSync(categoriesPath)) {
    categoriesData = JSON.parse(readFileSync(categoriesPath, "utf8"));
    console.log(JSON.stringify(categoriesData, null, 2));
    const ajv = new Ajv();
    const validate = ajv.compile(categoriesFileSchema);
    const valid = validate(categoriesData);
    if (!valid) {
      console.error("Categories validation errors:", validate.errors);
      throw new Error("Invalid categories data in categories.json");
    }
  }
  return categoriesData;
};

export const setUpSite = async ({
  constellation,
  categoriesData,
  siteId,
  variableIds = {},
}: {
  constellation: Constellation;
  categoriesData: ContentCategory<ContentCategoryMetadataField>[];
  siteId?: string;
  variableIds?: PossiblyIncompleteVariableIds;
}) => {
  // Variables for moderation database
  const trustedSitesSiteIdVar =
    variableIds.trustedSitesSiteIdVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const trustedSitesNameVar =
    variableIds.trustedSitesNameVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const featuredReleasesReleaseIdVar =
    variableIds.featuredReleasesReleaseIdVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const featuredReleasesStartTimeVar =
    variableIds.featuredReleasesStartTimeVar ||
    (await constellation.variables.créerVariable({
      catégorie: "horoDatage",
    }));
  const featuredReleasesEndTimeVar =
    variableIds.featuredReleasesEndTimeVar ||
    (await constellation.variables.créerVariable({
      catégorie: "horoDatage",
    }));
  const featuredReleasesPromotedVar =
    variableIds.featuredReleasesPromotedVar ||
    (await constellation.variables.créerVariable({
      catégorie: "booléen",
    }));
  const blockedReleasesReleaseIdVar =
    variableIds.blockedReleasesReleaseIdVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const contentCategoriesCategoryIdVar =
    variableIds.contentCategoriesCategoryIdVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const contentCategoriesDisplayNameVar =
    variableIds.contentCategoriesDisplayNameVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const contentCategoriesFeaturedVar =
    variableIds.contentCategoriesFeaturedVar ||
    (await constellation.variables.créerVariable({
      catégorie: "booléen",
    }));
  const contentCategoriesMetadataSchemaVar =
    variableIds.contentCategoriesMetadataSchemaVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));

  // Variables for releases table
  const releasesFileVar =
    variableIds.releasesFileVar ||
    (await constellation.variables.créerVariable({
      catégorie: "fichier",
    }));
  const releasesThumbnailVar =
    variableIds.releasesThumbnailVar ||
    (await constellation.variables.créerVariable({
      catégorie: "fichier",
    }));
  const releasesCoverVar =
    variableIds.releasesCoverVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const releasesAuthorVar =
    variableIds.releasesAuthorVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const releasesMetadataVar =
    variableIds.releasesMetadataVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const releasesContentNameVar =
    variableIds.releasesContentNameVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const releasesCategoryVar =
    variableIds.releasesCategoryVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));

  // Variables for collections table
  const collectionsNameVar =
    variableIds.collectionsNameVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const collectionsAuthorVar =
    variableIds.collectionsAuthorVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const collectionsMetadataVar =
    variableIds.collectionsMetadataVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const collectionsReleasesVar =
    variableIds.collectionsReleasesVar ||
    (await constellation.variables.créerVariable({
      catégorie: "chaîneNonTraductible",
    }));
  const collectionsThumbnailVar =
    variableIds.collectionsThumbnailVar ||
    (await constellation.variables.créerVariable({
      catégorie: "fichier",
    }));
  const collectionsCategoryVar =
    variableIds.collectionsCategoryVar ||
    (await constellation.variables.créerVariable({
      catégorie: "fichier",
    }));

  // Swarm ID for site
  let swarmId = siteId
    ? await constellation.orbite.appliquerFonctionBdOrbite({
        idBd: siteId,
        fonction: "get",
        args: ["swarmId"],
      })
    : undefined;
  if (!swarmId) {
    swarmId = await constellation.nuées.créerNuée({});

    // Now we can specify the format for individual release dbs and collections
    const releasesDbFormat = getSwarmDbSchema({
      releasesFileVar,
      releasesCategoryVar,
      releasesThumbnailVar,
      releasesCoverVar,
      releasesAuthorVar,
      releasesContentNameVar,
      releasesMetadataVar,
      collectionsAuthorVar,
      collectionsMetadataVar,
      collectionsNameVar,
      collectionsReleasesVar,
      collectionsThumbnailVar,
      collectionsCategoryVar,
      swarmId,
    });
    for (const table of releasesDbFormat.tableaux) {
      const tableKey = table.clef;
      const idTableau = await constellation.nuées.ajouterTableauNuée({
        idNuée: swarmId,
        clefTableau: tableKey,
      });
      for (const col of table.cols) {
        await constellation.nuées.ajouterColonneTableauNuée({
          idTableau,
          idVariable: col.idVariable,
          idColonne: col.idColonne,
        });
      }
    }
  }

  let modDbId = siteId
    ? await constellation.orbite.appliquerFonctionBdOrbite({
        idBd: siteId,
        fonction: "get",
        args: ["modDb"],
      })
    : undefined;
  if (!modDbId) {
    modDbId = await constellation.bds.créerBdDeSchéma({
      schéma: {
        licence: "ODbl-1_0",
        tableaux: [
          {
            cols: [
              {
                idVariable: trustedSitesSiteIdVar,
                idColonne: TRUSTED_SITES_SITE_ID_COL,
              },
              {
                idVariable: trustedSitesNameVar,
                idColonne: TRUSTED_SITES_NAME_COL,
              },
            ],
            clef: TRUSTED_SITES_TABLE_KEY,
          },
          {
            cols: [
              {
                idVariable: featuredReleasesReleaseIdVar,
                idColonne: FEATURED_RELEASES_RELEASE_ID_COLUMN,
              },
              {
                idVariable: featuredReleasesStartTimeVar,
                idColonne: FEATURED_RELEASES_START_TIME_COLUMN,
              },
              {
                idVariable: featuredReleasesEndTimeVar,
                idColonne: FEATURED_RELEASES_END_TIME_COLUMN,
              },
              {
                idVariable: featuredReleasesPromotedVar,
                idColonne: FEATURED_PROMOTED_COLUMN,
              },
            ],
            clef: FEATURED_RELEASES_TABLE_KEY,
          },
          {
            cols: [
              {
                idVariable: blockedReleasesReleaseIdVar,
                idColonne: BLOCKED_RELEASES_RELEASE_ID_COLUMN,
              },
            ],
            clef: BLOCKED_RELEASES_TABLE_KEY,
          },
          {
            cols: [
              {
                idVariable: contentCategoriesCategoryIdVar,
                idColonne: CONTENT_CATEGORIES_CATEGORY_ID,
              },
              {
                idVariable: contentCategoriesDisplayNameVar,
                idColonne: CONTENT_CATEGORIES_DISPLAY_NAME,
              },
              {
                idVariable: contentCategoriesFeaturedVar,
                idColonne: CONTENT_CATEGORIES_FEATURED,
              },
              {
                idVariable: contentCategoriesMetadataSchemaVar,
                idColonne: CONTENT_CATEGORIES_METADATA_SCHEMA,
              },
            ],
            clef: CONTENT_CATEGORIES_TABLE_KEY,
          },
        ],
      },
    });
    for (const category of categoriesData) {
      const vals: types.élémentsBd = {
        [CONTENT_CATEGORIES_CATEGORY_ID]: category.categoryId,
        [CONTENT_CATEGORIES_DISPLAY_NAME]: category.displayName,
        [CONTENT_CATEGORIES_METADATA_SCHEMA]: JSON.stringify(
          category.metadataSchema,
        ),
      };
      if (category.featured) {
        vals[CONTENT_CATEGORIES_FEATURED] = category.featured;
      }
      await constellation.bds.ajouterÉlémentÀTableauParClef({
        idBd: modDbId,
        clefTableau: CONTENT_CATEGORIES_TABLE_KEY,
        vals,
      });
    }
  }

  const completeVariableIds: VariableIds = {
    // Federation stuff
    trustedSitesSiteIdVar,
    trustedSitesNameVar,

    // featured releases
    featuredReleasesReleaseIdVar,
    featuredReleasesStartTimeVar,
    featuredReleasesEndTimeVar,
    featuredReleasesPromotedVar,

    // blocked releases
    blockedReleasesReleaseIdVar,

    // content categories
    contentCategoriesCategoryIdVar,
    contentCategoriesDisplayNameVar,
    contentCategoriesFeaturedVar,
    contentCategoriesMetadataSchemaVar,

    // releases
    releasesFileVar,
    releasesAuthorVar,
    releasesContentNameVar,
    releasesThumbnailVar,
    releasesCoverVar,
    releasesMetadataVar,
    releasesCategoryVar,

    // collections
    collectionsAuthorVar,
    collectionsMetadataVar,
    collectionsNameVar,
    collectionsThumbnailVar,
    collectionsReleasesVar,
    collectionsCategoryVar,
  };

  siteId =
    siteId ||
    (await constellation.créerBdIndépendante({
      type: "keyvalue",
    }));

  await constellation.orbite.appliquerFonctionBdOrbite({
    idBd: siteId,
    fonction: "put",
    args: ["modDb", modDbId],
  });

  await constellation.orbite.appliquerFonctionBdOrbite({
    idBd: siteId,
    fonction: "put",
    args: ["swarmId", swarmId],
  });

  return {
    siteId,
    variableIds: completeVariableIds,
  };
};

export const checkVariableIdsComplete = (
  ids?: PossiblyIncompleteVariableIds,
): ids is VariableIds => {
  return (
    !!ids && variableIdKeys.every((k) => Object.keys(ids).includes(k) && ids[k])
  );
};

export class Orbiter {
  siteId: string;

  variableIds: VariableIds;

  constellation: Constellation;
  events: TypedEmitter<OrbiterEvents>;
  forgetFns: forgetFunction[] = [];
  private _siteSwarmIdCache = new Map<string, string>();

  constructor({
    siteId,
    variableIds,
    constellation,
  }: {
    siteId: string;
    constellation: Constellation;
    variableIds?: VariableIds;
  }) {
    this.events = new TypedEmitter<OrbiterEvents>();

    this.siteId = siteId;

    this.variableIds = variableIds ?? DEFAULT_VARIABLE_IDS;

    this.constellation = constellation;

    this._init();
  }

  async _init() {
    const { swarmId, modDbId } = await this.orbiterConfig();
    // await this.constellation.attendreInitialisée()
    
    // @ts-ignore - Add transport filter to constellation
    this.constellation.filtreTransport = (transport: any): boolean => {
      if (transport && transport.remoteAddr) {
        const addrStr = String(transport.remoteAddr);
        
        if (addrStr.includes('/p2p-circuit/')) {
          return true;
        }
        
        if (addrStr.includes('/ip4/127.0.0.1/') || addrStr.includes('/ip4/localhost/')) {
          return false;
        }
      }
      
      return true;
    };
    
    this.forgetFns.push(
      await this.constellation.suivreBd({
        id: this.siteId,
        type: "keyvalue",
        f: faisRien,
        schéma: OrbiterSiteDbSchema,
      }),
    );
    this.forgetFns.push(
      await this.constellation.suivreBd({
        id: swarmId,
        type: "keyvalue",
        f: faisRien,
        schéma: OrbiterSiteDbSchema,
      }),
    );
    this.forgetFns.push(
      await this.constellation.suivreBd({
        id: modDbId,
        type: "keyvalue",
        f: faisRien,
        schéma: OrbiterSiteDbSchema,
      }),
    );
  }

  async orbiterConfig(): Promise<{
    modDbId: string;
    swarmId: string;
    swarmSchema: bds.schémaSpécificationBd;
  }> {
    const modDbId = (await uneFois(
      async (fSuivi: types.schémaFonctionSuivi<string | undefined>) => {
        return await this.constellation.suivreBd({
          id: this.siteId,
          type: "keyvalue",
          f: async (x) => fSuivi(await x.get("modDb")),
          schéma: OrbiterSiteDbSchema,
        });
      },
    )) as string;

    const swarmId = (await uneFois(
      async (fSuivi: types.schémaFonctionSuivi<string | undefined>) => {
        return await this.constellation.suivreBd({
          id: this.siteId,
          type: "keyvalue",
          f: async (x) => fSuivi(await x.get("swarmId")),
          schéma: OrbiterSiteDbSchema,
        });
      },
      (x) => typeof x === "string",
    )) as string;

    const swarmSchema = getSwarmDbSchema({
      ...this.variableIds,
      swarmId: swarmId,
    });

    return {
      modDbId,
      swarmId,
      swarmSchema,
    };
  }

  async followSiteSwarmId({
    f,
    siteId,
  }: {
    f: (x: string) => void;
    siteId?: string;
  }): Promise<forgetFunction> {
    // Use this site's id if none is given
    siteId = siteId || this.siteId;

    return await this.constellation.suivreBdDic({
      id: siteId,
      schéma: ROOT_DB_JSON_SCHEMA,
      f: (x) => {
        const swarmId = x["swarmId"];
        if (typeof swarmId === "string") f(swarmId);
      },
    });
  }

  async followSiteModDbId({
    f,
    siteId,
  }: {
    f: (x: string) => void;
    siteId?: string;
  }): Promise<forgetFunction> {
    // Use this site's id if none is given
    siteId = siteId || this.siteId;

    return await this.constellation.suivreBdDic({
      id: siteId,
      schéma: ROOT_DB_JSON_SCHEMA,
      f: (x) => {
        const modDbId = x["modDb"];
        if (typeof modDbId === "string") f(modDbId);
      },
    });
  }

  // Accessing network data
  async followTrustedSites({
    f,
  }: {
    f: (sites?: tableaux.élémentDonnées<TrustedSite>[]) => void;
  }): Promise<forgetFunction> {
    return await suivreFonctionImbriquée({
      fRacine: async ({
        fSuivreRacine,
      }: {
        fSuivreRacine: (nouvelIdBdCible?: string | undefined) => Promise<void>;
      }): Promise<forgetFunction> => {
        return await this.constellation.suivreBd({
          id: this.siteId,
          f: async (x) => await fSuivreRacine(await x.get("modDb")),
          type: "keyvalue",
          schéma: OrbiterSiteDbSchema,
        });
      },
      f,
      fSuivre: async ({
        id,
        fSuivreBd,
      }: {
        id: string;
        fSuivreBd: types.schémaFonctionSuivi<
          tableaux.élémentDonnées<TrustedSite>[] | undefined
        >;
      }) => {
        return this.constellation.bds.suivreDonnéesDeTableauParClef<TrustedSite>(
          {
            idBd: id,
            clefTableau: TRUSTED_SITES_TABLE_KEY,
            f: fSuivreBd,
          },
        );
      },
    });
  }

  async listenForSiteBlockedReleases({
    f,
    siteId,
  }: {
    f: (releases?: { cid: string; id: string }[]) => void;
    siteId?: string;
  }): Promise<forgetFunction> {
    return await suivreFonctionImbriquée({
      fRacine: async ({
        fSuivreRacine,
      }: {
        fSuivreRacine: (nouvelIdBdCible?: string) => Promise<void>;
      }): Promise<forgetFunction> => {
        return await this.followSiteModDbId({
          f: fSuivreRacine,
          siteId,
        });
      },
      f: ignorerNonDéfinis(f),
      fSuivre: async ({
        id,
        fSuivreBd,
      }: {
        id: string;
        fSuivreBd: types.schémaFonctionSuivi<
          { cid: string; id: string }[] | undefined
        >;
      }): Promise<forgetFunction> => {
        return await this.constellation.bds.suivreDonnéesDeTableauParClef<BlockedRelease>(
          {
            idBd: id,
            clefTableau: BLOCKED_RELEASES_TABLE_KEY,
            f: async (blocked) => {
              if (blocked)
                await fSuivreBd(
                  blocked.map((b) => {
                    return {
                      cid: b.données[BLOCKED_RELEASES_RELEASE_ID_COLUMN],
                      id: b.id,
                    };
                  }),
                );
            },
          },
        );
      },
    });
  }

  async listenForSiteReleases({
    f,
    siteId,
    desiredNResults = 1000,
    maxRetries = 3,
    initialDelay = 1000,
  }: {
    f: types.schémaFonctionSuivi<
      { release: ReleaseWithId; contributor: string }[]
    >;
    siteId?: string;
    desiredNResults?: number;
    maxRetries?: number;
    initialDelay?: number;
  }): Promise<types.schémaFonctionOublier> {
    const siteCacheKey = siteId || this.siteId;
    
    const connectWithRetry = async (attempt = 0): Promise<types.schémaFonctionOublier> => {
      try {
        return await suivreFonctionImbriquée({
          fRacine: async ({
            fSuivreRacine,
          }: {
            fSuivreRacine: (nouvelIdBdCible?: string) => Promise<void>;
          }): Promise<forgetFunction> => {
            const cachedSwarmId = this._siteSwarmIdCache.get(siteCacheKey);
            if (cachedSwarmId) {
              await fSuivreRacine(cachedSwarmId);
              return () => Promise.resolve();
            }

            return await this.followSiteSwarmId({
              f: async (id) => {
                if (id) this._siteSwarmIdCache.set(siteCacheKey, id);
                await fSuivreRacine(id);
              },
              siteId,
            });
          },
          f: ignorerNonDéfinis(f),
          fSuivre: async ({
            id,
            fSuivreBd,
          }: {
            id: string;
            fSuivreBd: types.schémaFonctionSuivi<
              { release: ReleaseWithId; contributor: string }[]
            >;
          }): Promise<forgetFunction> => {
            try {
              const { fOublier } =
                await this.constellation.nuées.suivreDonnéesTableauNuée<Release>({
                  idNuée: id,
                  clefTableau: RELEASES_DB_TABLE_KEY,
                  f: (releases) =>
                    fSuivreBd(
                      releases.map((r) => ({
                        release: {
                          release: r.élément.données,
                          id: r.élément.id,
                        },
                        contributor: r.idCompte,
                      })),
                    ),
                  nRésultatsDésirés: desiredNResults,
                  clefsSelonVariables: false,
                });
              return fOublier;
            } catch (error) {
              if (error instanceof Error && 
                  error.message.includes("Cannot push value onto an ended pushable")) {
                console.warn(`Ended pushable error for site ${siteCacheKey} in releases:`, error);
                this.events.emit("syncError", error, "connection");
                
                throw error;
              }
              
              console.error(`Error in suivreDonnéesTableauNuée for site ${siteCacheKey}:`, error);
              this.events.emit("syncError", error as Error, "releases");
              throw error;
            }
          },
        });
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt) * (0.5 + Math.random());
          console.warn(`Error connecting to site ${siteCacheKey} for releases, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return connectWithRetry(attempt + 1);
        }
        
        console.error(`Failed to connect to site ${siteCacheKey} for releases after ${maxRetries} attempts:`, error);
        this.events.emit("syncError", error as Error, "connection");
        
        return () => Promise.resolve();
      }
    };
    
    return connectWithRetry();
  }

  async listenForSiteCollections({
    f,
    siteId,
    desiredNResults = 1000,
    maxRetries = 3,
    initialDelay = 1000,
  }: {
    f: types.schémaFonctionSuivi<
      { collection: CollectionWithId; contributor: string }[]
    >;
    siteId?: string;
    desiredNResults?: number;
    maxRetries?: number;
    initialDelay?: number;
  }): Promise<types.schémaFonctionOublier> {
    const siteCacheKey = siteId || this.siteId;
    
    const connectWithRetry = async (attempt = 0): Promise<types.schémaFonctionOublier> => {
      try {
        return await suivreFonctionImbriquée({
          fRacine: async ({
            fSuivreRacine,
          }: {
            fSuivreRacine: (nouvelIdBdCible?: string) => Promise<void>;
          }): Promise<forgetFunction> => {
            const cachedSwarmId = this._siteSwarmIdCache.get(siteCacheKey);
            if (cachedSwarmId) {
              await fSuivreRacine(cachedSwarmId);
              return () => Promise.resolve();
            }

            return await this.followSiteSwarmId({
              f: async (id) => {
                if (id) this._siteSwarmIdCache.set(siteCacheKey, id);
                await fSuivreRacine(id);
              },
              siteId,
            });
          },
          f: ignorerNonDéfinis(f),
          fSuivre: async ({
            id,
            fSuivreBd,
          }: {
            id: string;
            fSuivreBd: types.schémaFonctionSuivi<
              { collection: CollectionWithId; contributor: string }[]
            >;
          }): Promise<forgetFunction> => {
            try {
              const { fOublier } =
                await this.constellation.nuées.suivreDonnéesTableauNuée<Collection>({
                  idNuée: id,
                  clefTableau: COLLECTIONS_DB_TABLE_KEY,
                  f: (collections) =>
                    fSuivreBd(
                      collections.map((c) => ({
                        collection: {
                          collection: c.élément.données,
                          id: c.élément.id,
                        },
                        contributor: c.idCompte,
                      })),
                    ),
                  nRésultatsDésirés: desiredNResults,
                  clefsSelonVariables: false,
                });
              return fOublier;
            } catch (error) {
              if (error instanceof Error && 
                  error.message.includes("Cannot push value onto an ended pushable")) {
                console.warn(`Ended pushable error for site ${siteCacheKey} in collections:`, error);
                this.events.emit("syncError", error, "connection");
                
                throw error;
              }
              
              console.error(`Error in suivreDonnéesTableauNuée for site ${siteCacheKey}:`, error);
              this.events.emit("syncError", error as Error, "collections");
              throw error;
            }
          },
        });
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt) * (0.5 + Math.random());
          console.warn(`Error connecting to site ${siteCacheKey} for collections, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return connectWithRetry(attempt + 1);
        }
        
        console.error(`Failed to connect to site ${siteCacheKey} for collections after ${maxRetries} attempts:`, error);
        this.events.emit("syncError", error as Error, "connection");
        
        return () => Promise.resolve();
      }
    };
    
    return connectWithRetry();
  }

  async listenForSiteFeaturedReleases({
    f,
    siteId,
  }: {
    f: types.schémaFonctionSuivi<{ id: string; featured: FeaturedRelease }[]>;
    siteId?: string;
  }): Promise<types.schémaFonctionOublier> {
    return await suivreFonctionImbriquée({
      fRacine: async ({
        fSuivreRacine,
      }: {
        fSuivreRacine: (nouvelIdBdCible?: string) => Promise<void>;
      }): Promise<forgetFunction> => {
        return await this.followSiteModDbId({
          f: fSuivreRacine,
          siteId,
        });
      },
      f: ignorerNonDéfinis(f),
      fSuivre: async ({
        id,
        fSuivreBd,
      }: {
        id: string;
        fSuivreBd: types.schémaFonctionSuivi<
          { id: string; featured: FeaturedRelease }[]
        >;
      }): Promise<forgetFunction> => {
        return await this.constellation.bds.suivreDonnéesDeTableauParClef<FeaturedRelease>(
          {
            idBd: id,
            clefTableau: FEATURED_RELEASES_TABLE_KEY,
            f: async (featured) => {
              await fSuivreBd(
                featured.map((x) => ({
                  id: x.id,
                  featured: x.données,
                })),
              );
            },
          },
        );
      },
    });
  }

  async listenForReleases({
    f,
    includeBlockedReleases = false,
  }: {
    f: (
      releases: { release: ReleaseWithId; contributor: string; site: string }[],
      isPartial: boolean
    ) => Promise<void>;
    includeBlockedReleases?: boolean;
  }): Promise<types.schémaFonctionOublier> {
    type SiteInfo = {
      blockedCids?: string[];
      entries?: { release: ReleaseWithId; contributor: string }[];
      fForget?: forgetFunction;
      connecting?: boolean;
      error?: Error;
    };
    const siteInfos: { [site: string]: SiteInfo } = {};
    const allKnownSites: Set<string> = new Set();

    const CONNECTION_POOL_LIMIT = 25; // Higher limit as per user feedback
    const siteQueue: string[] = [];
    let activeConnections = 0;

    let cancelled = false;
    const lock = new Lock();

    const processNextSite = async () => {
      if (cancelled) return;
      
      if (activeConnections >= CONNECTION_POOL_LIMIT || siteQueue.length === 0) {
        return;
      }

      const siteId = siteQueue.shift()!;
      
      if (siteInfos[siteId]?.connecting || (siteInfos[siteId]?.entries !== undefined)) {
        processNextSite();
        return;
      }

      if (!siteInfos[siteId]) {
        siteInfos[siteId] = {};
      }
      siteInfos[siteId].connecting = true;
      activeConnections++;

      try {
        const fsForgetSite: types.schémaFonctionOublier[] = [];

        await Promise.all([
          // Listen for blocked releases
          this.listenForSiteBlockedReleases({
            f: async (cids) => {
              if (cancelled) return;
              if (siteInfos[siteId]) {
                siteInfos[siteId].blockedCids = cids?.map((c) => c.cid);
                await fFinal();
              }
            },
            siteId: siteId,
          }).then((fForget) => {
            fsForgetSite.push(fForget);
            return fForget;
          }).catch((error) => {
            console.error(`Error listening for blocked releases from site ${siteId}:`, error);
            this.events.emit("syncError", error, "releases");
          }),

          this.listenForSiteReleases({
            f: async (entries) => {
              if (cancelled) return;
              if (siteInfos[siteId]) {
                siteInfos[siteId].entries = entries;
                await fFinal();
              }
            },
            siteId: siteId,
          }).then((fOublier) => {
            fsForgetSite.push(fOublier);
            return fOublier;
          }).catch((error) => {
            console.error(`Error listening for releases from site ${siteId}:`, error);
            this.events.emit("syncError", error, "releases");
          }),
        ]);

        siteInfos[siteId].fForget = async () => {
          try {
            await Promise.all(fsForgetSite.map((f) => f().catch(e => {
              console.warn(`Error during forget function for site ${siteId}:`, e);
            })));
          } catch (error) {
            console.error(`Error in forget function for site ${siteId}:`, error);
          }
        };

        this.events.emit("syncProgress", {
          total: allKnownSites.size,
          loaded: Object.keys(siteInfos).filter(id => siteInfos[id].entries !== undefined).length,
          type: "releases"
        });

        await fFinal();
      } catch (error) {
        console.error(`Error processing site ${siteId}:`, error);
        siteInfos[siteId].error = error as Error;
        this.events.emit("syncError", error as Error, "releases");
      } finally {
        if (siteInfos[siteId]) {
          siteInfos[siteId].connecting = false;
        }
        activeConnections--;
        
        processNextSite();
      }
    };

    const fFinal = async () => {
      try {
        const blockedCids = includeBlockedReleases ? [] : Object.values(siteInfos)
          .map((s) => s.blockedCids || [])
          .flat();
        
        const releases = Object.entries(siteInfos)
          .filter(([_, info]) => info.entries !== undefined) // Only include sites with entries
          .map(([site, info]) => (info.entries || []).map((r) => ({ ...r, site })))
          .flat()
          .filter((r) => !blockedCids.includes(r.release.release.file));

        const isPartialSync = allKnownSites.size > Object.keys(siteInfos).filter(
          id => siteInfos[id].entries !== undefined
        ).length;

        this.events.emit("releases", releases, isPartialSync);

        await f(releases, isPartialSync);
      } catch (error) {
        console.error("Error in fFinal:", error);
        this.events.emit("syncError", error as Error, "releases");
      }
    };

    const fFollowTrustedSites = async (
      sites?: tableaux.élémentDonnées<TrustedSite>[],
    ) => {
      try {
        const sitesList = (sites || []).map((s) => s.données);
        sitesList.push({
          [TRUSTED_SITES_SITE_ID_COL]: this.siteId,
          [TRUSTED_SITES_NAME_COL]: "Me !",
        });

        sitesList.forEach((site) =>
          allKnownSites.add(site[TRUSTED_SITES_SITE_ID_COL]),
        );

        await lock.acquire();
        if (cancelled) {
          lock.release();
          return;
        }

        const newSites = sitesList.filter(
          (s) => !Object.keys(siteInfos).includes(s.siteId),
        );
        const obsoleteSites = Object.keys(siteInfos).filter(
          (s) => !sitesList.some((x) => x.siteId === s),
        );

        newSites.forEach(site => {
          const { siteId } = site;
          if (!siteInfos[siteId]) {
            siteInfos[siteId] = {};
          }
          siteQueue.push(siteId);
        });

        const processPromises = [];
        for (let i = 0; i < Math.min(CONNECTION_POOL_LIMIT, siteQueue.length); i++) {
          processPromises.push(processNextSite());
        }
        
        await Promise.all(processPromises);

        for (const site of obsoleteSites) {
          const { fForget } = siteInfos[site];
          if (fForget) {
            try {
              await fForget();
            } catch (error) {
              console.error(`Error forgetting site ${site}:`, error);
            }
          }
          delete siteInfos[site];
        }

        await fFinal();
        lock.release();
      } catch (error) {
        console.error("Error in fFollowTrustedSites:", error);
        this.events.emit("syncError", error as Error, "releases");
        lock.release();
      }
    };

    // Need to call once manually to get the user's own entries to show even if user is offline or
    // the site's master databases are unreachable.
    try {
      await fFollowTrustedSites();
    } catch (error) {
      console.error("Error in initial fFollowTrustedSites call:", error);
      this.events.emit("syncError", error as Error, "releases");
    }

    let forgetTrustedSites: types.schémaFonctionOublier;
    this.followTrustedSites({ f: fFollowTrustedSites })
      .then((fForget) => (forgetTrustedSites = fForget))
      .catch((error) => {
        console.error("Error setting up trusted sites listener:", error);
        this.events.emit("syncError", error as Error, "releases");
      });

    const fForget = async () => {
      try {
        cancelled = true;
        if (forgetTrustedSites) await forgetTrustedSites();
        
        await Promise.all(
          Object.values(siteInfos).map((s) =>
            s.fForget ? s.fForget().catch(e => {
              console.warn("Error during site forget:", e);
            }) : Promise.resolve(),
          ),
        );
      } catch (error) {
        console.error("Error in fForget:", error);
      }
    };

    return fForget;
  }

  // Todo: refactor listenForReleases, listenForCollections, and listenForFeaturedReleases to remove duplicated code
  async listenForCollections({
    f,
  }: {
    f: (
      collections: { collection: CollectionWithId; contributor: string; site: string }[],
      isPartial: boolean
    ) => Promise<void>;
  }): Promise<types.schémaFonctionOublier> {
    type SiteInfo = {
      entries?: { collection: CollectionWithId; contributor: string }[];
      fForget?: forgetFunction;
      connecting?: boolean;
      error?: Error;
    };
    const siteInfos: { [site: string]: SiteInfo } = {};
    const allKnownSites: Set<string> = new Set();

    const CONNECTION_POOL_LIMIT = 25;
    const siteQueue: string[] = [];
    let activeConnections = 0;

    let cancelled = false;
    const lock = new Lock();

    const processNextSite = async () => {
      if (cancelled) return;
      
      if (activeConnections >= CONNECTION_POOL_LIMIT || siteQueue.length === 0) {
        return;
      }

      const siteId = siteQueue.shift()!;
      
      if (siteInfos[siteId]?.connecting || (siteInfos[siteId]?.entries !== undefined)) {
        processNextSite();
        return;
      }

      if (!siteInfos[siteId]) {
        siteInfos[siteId] = {};
      }
      siteInfos[siteId].connecting = true;
      activeConnections++;

      try {
        const fsForgetSite: types.schémaFonctionOublier[] = [];

        // Listen for site collections with error handling
        await this.listenForSiteCollections({
          f: async (entries) => {
            if (cancelled) return;
            if (siteInfos[siteId]) {
              siteInfos[siteId].entries = entries;
              await fFinal();
            }
          },
          siteId: siteId,
        }).then((fOublier) => {
          fsForgetSite.push(fOublier);
          return fOublier;
        }).catch((error) => {
          console.error(`Error listening for collections from site ${siteId}:`, error);
          this.events.emit("syncError", error, "collections");
        });

        siteInfos[siteId].fForget = async () => {
          try {
            await Promise.all(fsForgetSite.map((f) => f().catch(e => {
              console.warn(`Error during forget function for site ${siteId}:`, e);
            })));
          } catch (error) {
            console.error(`Error in forget function for site ${siteId}:`, error);
          }
        };

        this.events.emit("syncProgress", {
          total: allKnownSites.size,
          loaded: Object.keys(siteInfos).filter(id => siteInfos[id].entries !== undefined).length,
          type: "collections"
        });

        await fFinal();
      } catch (error) {
        console.error(`Error processing site ${siteId}:`, error);
        siteInfos[siteId].error = error as Error;
        this.events.emit("syncError", error as Error, "collections");
      } finally {
        if (siteInfos[siteId]) {
          siteInfos[siteId].connecting = false;
        }
        activeConnections--;
        
        processNextSite();
      }
    };

    const fFinal = async () => {
      try {
        const collections = Object.entries(siteInfos)
          .filter(([_, info]) => info.entries !== undefined) // Only include sites with entries
          .map(([site, info]) => (info.entries || []).map((r) => ({ ...r, site })))
          .flat();

        const isPartialSync = allKnownSites.size > Object.keys(siteInfos).filter(
          id => siteInfos[id].entries !== undefined
        ).length;

        this.events.emit("collections", collections, isPartialSync);

        await f(collections, isPartialSync);
      } catch (error) {
        console.error("Error in fFinal:", error);
        this.events.emit("syncError", error as Error, "collections");
      }
    };

    const fFollowTrustedSites = async (
      sites?: tableaux.élémentDonnées<TrustedSite>[],
    ) => {
      try {
        const sitesList = (sites || []).map((s) => s.données);
        sitesList.push({
          [TRUSTED_SITES_SITE_ID_COL]: this.siteId,
          [TRUSTED_SITES_NAME_COL]: "Me !",
        });

        sitesList.forEach((site) =>
          allKnownSites.add(site[TRUSTED_SITES_SITE_ID_COL]),
        );

        await lock.acquire();
        if (cancelled) {
          lock.release();
          return;
        }

        const newSites = sitesList.filter(
          (s) => !Object.keys(siteInfos).includes(s.siteId),
        );
        const obsoleteSites = Object.keys(siteInfos).filter(
          (s) => !sitesList.some((x) => x.siteId === s),
        );

        newSites.forEach(site => {
          const { siteId } = site;
          if (!siteInfos[siteId]) {
            siteInfos[siteId] = {};
          }
          siteQueue.push(siteId);
        });

        const processPromises = [];
        for (let i = 0; i < Math.min(CONNECTION_POOL_LIMIT, siteQueue.length); i++) {
          processPromises.push(processNextSite());
        }
        
        await Promise.all(processPromises);

        for (const site of obsoleteSites) {
          const { fForget } = siteInfos[site];
          if (fForget) {
            try {
              await fForget();
            } catch (error) {
              console.error(`Error forgetting site ${site}:`, error);
            }
          }
          delete siteInfos[site];
        }

        await fFinal();
        lock.release();
      } catch (error) {
        console.error("Error in fFollowTrustedSites:", error);
        this.events.emit("syncError", error as Error, "collections");
        lock.release();
      }
    };

    // Need to call once manually to get the user's own entries to show even if user is offline or
    // the site's master databases are unreachable.
    try {
      await fFollowTrustedSites();
    } catch (error) {
      console.error("Error in initial fFollowTrustedSites call:", error);
      this.events.emit("syncError", error as Error, "collections");
    }

    let forgetTrustedSites: types.schémaFonctionOublier;
    this.followTrustedSites({ f: fFollowTrustedSites })
      .then((fForget) => (forgetTrustedSites = fForget))
      .catch((error) => {
        console.error("Error setting up trusted sites listener:", error);
        this.events.emit("syncError", error as Error, "collections");
      });

    const fForget = async () => {
      try {
        cancelled = true;
        if (forgetTrustedSites) await forgetTrustedSites();
        
        await Promise.all(
          Object.values(siteInfos).map((s) =>
            s.fForget ? s.fForget().catch(e => {
              console.warn("Error during site forget:", e);
            }) : Promise.resolve(),
          ),
        );
      } catch (error) {
        console.error("Error in fForget:", error);
      }
    };

    return fForget;
  }

  // User functionalities - adding and editing content

  async addRelease(release: Release): Promise<void> {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    await this.constellation.bds.ajouterÉlémentÀTableauUnique({
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: RELEASES_DB_TABLE_KEY,
      vals: removeUndefined(release),
    });
  }

  async removeRelease(releaseId: string) {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    await this.constellation.bds.effacerÉlémentDeTableauUnique({
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: RELEASES_DB_TABLE_KEY,
      idÉlément: releaseId,
    });
  }

  async editRelease({
    release,
    releaseId,
  }: {
    release: Partial<Release>;
    releaseId: string;
  }): Promise<void> {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    return await this.constellation.bds.modifierÉlémentDeTableauUnique({
      vals: release,
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: RELEASES_DB_TABLE_KEY,
      idÉlément: releaseId,
    });
  }

  async addCollection(collection: Collection): Promise<void> {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    await this.constellation.bds.ajouterÉlémentÀTableauUnique({
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: COLLECTIONS_DB_TABLE_KEY,
      vals: removeUndefined(collection),
    });
  }

  async removeCollection(collectionId: string) {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    await this.constellation.bds.effacerÉlémentDeTableauUnique({
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: COLLECTIONS_DB_TABLE_KEY,
      idÉlément: collectionId,
    });
  }

  async editCollection({
    collection,
    collectionId,
  }: {
    collection: Partial<Collection>;
    collectionId: string;
  }): Promise<void> {
    const { swarmId, swarmSchema } = await this.orbiterConfig();

    return await this.constellation.bds.modifierÉlémentDeTableauUnique({
      vals: collection,
      schémaBd: swarmSchema,
      idNuéeUnique: swarmId,
      clefTableau: COLLECTIONS_DB_TABLE_KEY,
      idÉlément: collectionId,
    });
  }

  async getCollectionReleasesSetId({
    collectionId,
  }: {
    collectionId: string;
  }): Promise<string> {
    const collections = await uneFois(
      async (
        fSuivi: types.schémaFonctionSuivi<CollectionWithId[]>,
      ): Promise<types.schémaFonctionOublier> => {
        return await this.listenForCollections({
          f: async (collections: { collection: CollectionWithId; contributor: string; site: string }[], _isPartial: boolean) =>
            fSuivi(collections.map((c: { collection: CollectionWithId; contributor: string; site: string }) => c.collection)),
        });
      },
    );
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) throw new Error("Collection not found.");
    return collection.collection[COLLECTIONS_RELEASES_COLUMN];
  }

  async addReleaseToCollection({
    releaseId,
    collectionId,
  }: {
    releaseId: string;
    collectionId: string;
  }): Promise<void> {
    const collectionReleases = await this.getCollectionReleasesSetId({
      collectionId,
    });
    await this.constellation.orbite.appliquerFonctionBdOrbite({
      idBd: collectionReleases,
      fonction: "add",
      args: [releaseId],
    });
  }

  async removeReleaseFromCollection({
    releaseId,
    collectionId,
  }: {
    releaseId: string;
    collectionId: string;
  }): Promise<void> {
    const collectionReleases = await this.getCollectionReleasesSetId({
      collectionId,
    });
    await this.constellation.orbite.appliquerFonctionBdOrbite({
      idBd: collectionReleases,
      fonction: "remove",
      args: [releaseId],
    });
  }

  // User profile functions
  async changeName({
    name,
    language,
  }: {
    name?: string;
    language: string;
  }): Promise<void> {
    if (name)
      await this.constellation.profil.sauvegarderNom({
        langue: language,
        nom: name,
      });
    else await this.constellation.profil.effacerNom({ langue: language });
  }

  async changeProfilePhoto({
    image,
  }: {
    image?: { contenu: Uint8Array; nomFichier: string };
  }): Promise<void> {
    if (image)
      return await this.constellation.profil.sauvegarderImage({ image });
    else return await this.constellation.profil.effacerImage();
  }

  async addContactInfo({
    type,
    contact,
  }: {
    type: string;
    contact: string;
  }): Promise<void> {
    return await this.constellation.profil.sauvegarderContact({
      type,
      contact,
    });
  }

  async removeContactInfo({
    type,
    contact,
  }: {
    type: string;
    contact?: string;
  }): Promise<void> {
    return await this.constellation.profil.effacerContact({ type, contact });
  }

  // async deleteAccount(): Promise<void> {
  //   return await this.constellation.fermerCompte();
  // }

  async listenForAccountId({
    f,
  }: {
    f: (account?: string) => void;
  }): Promise<forgetFunction> {
    return await this.constellation.suivreIdCompte({ f });
  }

  async listenForAccountExists({
    f,
  }: {
    f: (exists: boolean) => void;
  }): Promise<forgetFunction> {
    return await this.constellation.profil.suivreInitialisé({ f });
  }

  async listenForNameChange({
    f,
    accountId,
  }: {
    f: (name: { [language: string]: string }) => void;
    accountId?: string;
  }): Promise<forgetFunction> {
    return await this.constellation.profil.suivreNoms({
      f,
      idCompte: accountId,
    });
  }

  async listenForContactInfoChange({
    f,
    accountId,
  }: {
    f: types.schémaFonctionSuivi<{ type: string; contact: string }[]>;
    accountId?: string;
  }): Promise<types.schémaFonctionOublier> {
    return await this.constellation.profil.suivreContacts({
      f,
      idCompte: accountId,
    });
  }

  async listenForProfilePhotoChange({
    f,
    accountId,
  }: {
    f: types.schémaFonctionSuivi<{ image: Uint8Array; idImage: string } | null>;
    accountId?: string;
  }): Promise<types.schémaFonctionOublier> {
    return await this.constellation.profil.suivreImage({
      f: f as any, // Type assertion to bypass the type check
      idCompte: accountId,
    });
  }

  async followCanUpload({
    f,
    userId,
  }: {
    f: (canUpload: boolean) => void;
    userId?: string;
  }) {
    const { swarmId } = await this.orbiterConfig();
    userId = userId || (await this.constellation.obtIdCompte());

    // TODO: this should be refactored into Constellation
    const info: {
      philosophy?: "IUPG" | "GUPI";
      memberStatus?: "exclus" | "accepté" | undefined;
    } = {};
    const fFinal = () => {
      if (info.philosophy === "IUPG") f(info.memberStatus !== "exclus");
      else f(info.memberStatus === "accepté");
    };
    const forgetPhilosophy =
      await this.constellation.nuées.suivrePhilosophieAutorisation({
        idNuée: swarmId,
        f: (philosophy) => {
          // Guilty until proven innocent (invitation-only) or innocent until proven guilty (open by default)
          info.philosophy = philosophy === "CJPI" ? "GUPI" : "IUPG";
          fFinal();
        },
      });
    const forgetAuthorisations =
      await this.constellation.nuées.suivreAutorisationsMembresDeNuée({
        idNuée: swarmId,
        f: (members) => {
          info.memberStatus = members.find(
            (m) => m.idCompte === userId,
          )?.statut;
          fFinal();
        },
      });
    return async () => {
      await forgetPhilosophy();
      await forgetAuthorisations();
    };
  }

  // Site moderator functions. Moderators can moderate content and exclude/invite other useres.
  // Admins can do all that and also invite other admins and moderators.

  async featureRelease({
    cid,
    startTime,
    endTime,
    promoted,
  }: {
    cid: string;
    startTime: string;
    endTime: string;
    promoted: boolean;
  }) {
    const { modDbId } = await this.orbiterConfig();

    return (
      await this.constellation.bds.ajouterÉlémentÀTableauParClef({
        idBd: modDbId,
        clefTableau: FEATURED_RELEASES_TABLE_KEY,
        vals: {
          [FEATURED_RELEASES_RELEASE_ID_COLUMN]: cid,
          [FEATURED_RELEASES_START_TIME_COLUMN]: startTime,
          [FEATURED_RELEASES_END_TIME_COLUMN]: endTime,
          [FEATURED_PROMOTED_COLUMN]: promoted,
        },
      })
    )[0];
  }

  async editFeaturedRelease({
    elementId,
    featuredRelease,
  }: {
    elementId: string;
    featuredRelease: Partial<FeaturedRelease>;
  }): Promise<void> {
    const { modDbId } = await this.orbiterConfig();

    await this.constellation.bds.modifierÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: FEATURED_RELEASES_TABLE_KEY,
      idÉlément: elementId,
      vals: removeUndefined(featuredRelease),
    });
  }

  async followIsModerator({
    f,
    userId,
  }: {
    f: (status: "ADMIN" | "MODERATOR" | undefined) => void;
    userId?: string;
  }): Promise<forgetFunction> {
    // User current user if none is specified.
    userId = userId || (await this.constellation.obtIdCompte());

    const resolveModType = (
      x?: "MODÉRATEUR" | "MEMBRE",
    ): "ADMIN" | "MODERATOR" | undefined => {
      return x === "MODÉRATEUR"
        ? "ADMIN"
        : x === "MEMBRE"
          ? "MODERATOR"
          : undefined;
    };

    return await this.constellation.suivreAccèsBd({
      id: this.siteId,
      f: (x) => f(resolveModType(x.find((y) => y.idCompte === userId)?.rôle)),
    });
  }

  async inviteModerator({
    userId,
    admin = false,
  }: {
    userId: string;
    admin?: boolean;
  }): Promise<void> {
    // Invitations are not revocable ! They can, however, be upgraded (moderator => admin), though not downgraded.

    const { modDbId, swarmId } = await this.orbiterConfig();

    await this.constellation.nuées.inviterAuteur({
      idNuée: swarmId,
      idCompteAuteur: userId,
      rôle: admin ? "MODÉRATEUR" : "MEMBRE",
    });
    await this.constellation.bds.inviterAuteur({
      idBd: modDbId,
      idCompteAuteur: userId,
      rôle: admin ? "MODÉRATEUR" : "MEMBRE",
    });
    if (admin) {
      await this.constellation.donnerAccès({
        idBd: this.siteId,
        identité: userId,
        rôle: "MODÉRATEUR",
      });
    }
  }

  async blockRelease({ cid }: { cid: string }): Promise<string> {
    const { modDbId } = await this.orbiterConfig();

    return (
      await this.constellation.bds.ajouterÉlémentÀTableauParClef({
        idBd: modDbId,
        clefTableau: BLOCKED_RELEASES_TABLE_KEY,
        vals: { [BLOCKED_RELEASES_RELEASE_ID_COLUMN]: cid },
      })
    )[0];
  }

  async unblockRelease({ id }: { id: string }): Promise<void> {
    const { modDbId } = await this.orbiterConfig();

    await this.constellation.bds.effacerÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: BLOCKED_RELEASES_TABLE_KEY,
      idÉlément: id,
    });
  }

  async makeSitePrivate(): Promise<void> {
    const { swarmId } = await this.orbiterConfig();
    const userId = await this.constellation.obtIdCompte();

    // Both releases and collections swarms share the same swarm and authorisation rules, so changing one will update both
    const authId =
      await this.constellation.nuées.obtGestionnaireAutorisationsDeNuée({
        idNuée: swarmId,
      });
    await this.constellation.nuées.changerPhisolophieAutorisation({
      idAutorisation: authId,
      philosophie: "CJPI",
    });
    await this.constellation.nuées.accepterMembreNuée({
      idNuée: swarmId,
      idCompte: userId,
    });
  }

  async makeSitePublic(): Promise<void> {
    const { swarmId } = await this.orbiterConfig();

    // Both releases and collections swarms share the same swarm and authorisation rules, so changing one will update both
    const authId =
      await this.constellation.nuées.obtGestionnaireAutorisationsDeNuée({
        idNuée: swarmId,
      });
    await this.constellation.nuées.changerPhisolophieAutorisation({
      idAutorisation: authId,
      philosophie: "IJPC",
    });
  }

  async inviteUser({ userId }: { userId: string }): Promise<void> {
    const { swarmId } = await this.orbiterConfig();

    // Both releases and collections swarms share the same swarm and authorisation rules, so changing one will update both
    await this.constellation.nuées.accepterMembreNuée({
      idNuée: swarmId,
      idCompte: userId,
    });
  }

  async blockUser({ userId }: { userId: string }): Promise<void> {
    const { swarmId } = await this.orbiterConfig();

    // Both releases and collections swarms share the same swarm and authorisation rules, so changing one will update both
    await this.constellation.nuées.exclureMembreDeNuée({
      idNuée: swarmId,
      idCompte: userId,
    });
  }

  async trustSite({
    siteId,
    siteName,
  }: {
    siteName: string;
    siteId: string;
  }): Promise<string> {
    const { modDbId } = await this.orbiterConfig();

    const elementIds =
      await this.constellation.bds.ajouterÉlémentÀTableauParClef<TrustedSite>({
        idBd: modDbId,
        clefTableau: TRUSTED_SITES_TABLE_KEY,
        vals: {
          [TRUSTED_SITES_SITE_ID_COL]: siteId,
          [TRUSTED_SITES_NAME_COL]: siteName,
        },
      });
    return elementIds[0];
  }

  async editTrustedSite({
    elementId,
    site,
  }: {
    elementId: string;
    site: Partial<TrustedSite>;
  }) {
    const { modDbId } = await this.orbiterConfig();

    await this.constellation.bds.modifierÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: TRUSTED_SITES_TABLE_KEY,
      idÉlément: elementId,
      vals: site,
    });
  }

  async untrustSite({ siteId }: { siteId: string }) {
    const { modDbId } = await this.orbiterConfig();
    await this.constellation.bds.effacerÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: TRUSTED_SITES_TABLE_KEY,
      idÉlément: siteId,
    });
  }

  async addCategory(category: ContentCategory): Promise<string> {
    const { modDbId } = await this.orbiterConfig();
    const vals: types.élémentsBd = {
      [CONTENT_CATEGORIES_CATEGORY_ID]: category.categoryId,
      [CONTENT_CATEGORIES_DISPLAY_NAME]: category.displayName,
      [CONTENT_CATEGORIES_METADATA_SCHEMA]: JSON.stringify(
        category.metadataSchema,
      ),
    };
    if (category.featured) {
      vals[CONTENT_CATEGORIES_FEATURED] = category.featured;
    }
    const elementIds =
      await this.constellation.bds.ajouterÉlémentÀTableauParClef({
        idBd: modDbId,
        clefTableau: CONTENT_CATEGORIES_TABLE_KEY,
        vals,
      });
    return elementIds[0];
  }

  async editCategory({
    elementId,
    category,
  }: {
    elementId: string;
    category: Partial<ContentCategory>;
  }): Promise<void> {
    const { modDbId } = await this.orbiterConfig();

    await this.constellation.bds.modifierÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: CONTENT_CATEGORIES_TABLE_KEY,
      idÉlément: elementId,
      vals: category,
    });
  }

  async removeCategory(elementId: string): Promise<void> {
    const { modDbId } = await this.orbiterConfig();

    await this.constellation.bds.effacerÉlémentDeTableauParClef({
      idBd: modDbId,
      clefTableau: CONTENT_CATEGORIES_TABLE_KEY,
      idÉlément: elementId,
    });
  }

  async listenForContentCategories({
    f,
  }: {
    f: types.schémaFonctionSuivi<ContentCategoryWithId[]>;
  }): Promise<types.schémaFonctionOublier> {
    const { modDbId } = await this.orbiterConfig();

    return await this.constellation.bds.suivreDonnéesDeTableauParClef<ContentCategory>(
      {
        idBd: modDbId,
        clefTableau: CONTENT_CATEGORIES_TABLE_KEY,
        f: async (categories) => {
          const mappedCategories = categories.map((c) => ({
            id: c.id,
            contentCategory: c.données,
          }));
          await f(mappedCategories);
        },
      },
    );
  }
}

export const createOrbiter = async ({
  constellation,
}: {
  constellation: Constellation;
}) => {
  const dir = await constellation.dossier();

  const existingConfig = await getConfig({
    dir,
  });
  if (!configIsComplete(existingConfig)) {
    throw new Error("Configure Orbiter with `orb config` first.");
  }
  const orbiter = new Orbiter({ constellation, ...existingConfig });

  return { orbiter };
};
