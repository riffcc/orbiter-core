import { type JSONSchemaType } from "ajv";

import type {
  BLOCKED_RELEASES_RELEASE_ID_COLUMN,
  COLLECTIONS_AUTHOR_COLUMN,
  COLLECTIONS_CATEGORY_COLUMN,
  COLLECTIONS_METADATA_COLUMN,
  COLLECTIONS_NAME_COLUMN,
  COLLECTIONS_RELEASES_COLUMN,
  COLLECTIONS_THUMBNAIL_COLUMN,
  FEATURED_RELEASES_END_TIME_COLUMN,
  FEATURED_RELEASES_RELEASE_ID_COLUMN,
  FEATURED_RELEASES_START_TIME_COLUMN,
  RELEASES_AUTHOR_COLUMN,
  RELEASES_CATEGORY_COLUMN,
  RELEASES_COVER_COLUMN,
  RELEASES_FILE_COLUMN,
  RELEASES_METADATA_COLUMN,
  RELEASES_NAME_COLUMN,
  RELEASES_THUMBNAIL_COLUMN,
  TRUSTED_SITES_NAME_COL,
  TRUSTED_SITES_SITE_ID_COL,
} from "./consts";

export const variableIdKeys = [
  "trustedSitesSiteIdVar",
  "trustedSitesNameVar",
  "releasesContentNameVar",
  "releasesFileVar",
  "releasesThumbnailVar",
  "releasesCoverVar",
  "releasesAuthorVar",
  "releasesMetadataVar",
  "releasesCategoryVar",
  "collectionsNameVar",
  "collectionsAuthorVar",
  "collectionsThumbnailVar",
  "collectionsMetadataVar",
  "collectionsCategoryVar",
  "collectionsReleasesVar",
  "featuredReleasesReleaseIdVar",
  "featuredReleasesStartTimeVar",
  "featuredReleasesEndTimeVar",
  "blockedReleasesReleaseIdVar",
] as const;

export type VariableIds = Record<(typeof variableIdKeys)[number], string>;

export type PossiblyIncompleteVariableIds = Partial<VariableIds>;

export type OrbiterConfig = {
  siteId: string;
  swarmId: string;
  variableIds: VariableIds;
};

export type RecursivePartial<T> = {
  // From https://stackoverflow.com/questions/41980195/recursive-partialt-in-typescript
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

export type PossiblyIncompleteOrbiterConfig = RecursivePartial<OrbiterConfig>;

export const possiblyIncompleteOrbiterConfigSchema: JSONSchemaType<PossiblyIncompleteOrbiterConfig> =
  {
    type: 'object',
    properties: {
      siteId: { type: "string", nullable: true },
      swarmId: { type: "string", nullable: true },
      variableIds: {
        type: 'object',
        nullable: true,
        properties: Object.fromEntries(
          variableIdKeys.map((v) => [v, { type: "string", nullable: true }]),
        ) as { [P in keyof VariableIds]: { type: "string", nullable: true } },
        required: [],
      },
    },
    required: [],
  };
export const orbiterConfigSchema: JSONSchemaType<OrbiterConfig> =
{
  type: 'object',
  properties: {
    siteId: { type: "string" },
    swarmId: { type: "string" },
    variableIds: {
      type: 'object',
      properties: Object.fromEntries(
        variableIdKeys.map((v) => [v, { type: "string" }]),
      ) as { [P in keyof VariableIds]: { type: "string" } },
      required: variableIdKeys
    },
  },
  required: ['siteId', 'swarmId', 'variableIds']
};

export type ConfigMode = "vite" | "json"; // Todo: add for other compilers?

export type Release = {
  [RELEASES_NAME_COLUMN]: string;
  [RELEASES_FILE_COLUMN]: string;
  [RELEASES_AUTHOR_COLUMN]: string;
  [RELEASES_THUMBNAIL_COLUMN]?: string;
  [RELEASES_METADATA_COLUMN]?: string;
  [RELEASES_CATEGORY_COLUMN]: string;
  [RELEASES_COVER_COLUMN]: string;
};

export type ReleaseWithId = {
  release: Release;
  id: string;
};

export type Collection = {
  [COLLECTIONS_NAME_COLUMN]: string;
  [COLLECTIONS_AUTHOR_COLUMN]?: string;
  [COLLECTIONS_THUMBNAIL_COLUMN]?: string;
  [COLLECTIONS_METADATA_COLUMN]?: string;
  [COLLECTIONS_CATEGORY_COLUMN]: string;
  [COLLECTIONS_RELEASES_COLUMN]: string;
};

export type FeaturedRelease = {
  [FEATURED_RELEASES_RELEASE_ID_COLUMN]: string;
  [FEATURED_RELEASES_START_TIME_COLUMN]: string;
  [FEATURED_RELEASES_END_TIME_COLUMN]: string;
};

export type BlockedRelease = {
  [BLOCKED_RELEASES_RELEASE_ID_COLUMN]: string;
};

export type CollectionWithId = {
  collection: Collection;
  id: string;
};

export type TrustedSite = {
  [TRUSTED_SITES_SITE_ID_COL]: string;
  [TRUSTED_SITES_NAME_COL]: string;
};

export interface ReleaseMetadata {
  description?: string;
  license?: string;
}

export interface MusicReleaseMetadata {
  tags?: string;
  musicBrainzID?: string;
  albumTitle?: string;
  initialReleaseYear?: string;
  releaseType?: string;
  fileFormat?: string;
  bitrate?: string;
  mediaFormat?: string;
}

export interface MovieReleaseMetadata {
  posterCID?: string;
  TMDBID?: string;
  IMDBID?: string;
  releaseType?: string;
}
