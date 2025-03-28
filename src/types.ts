import { type JSONSchemaType } from "ajv";

import {
  BLOCKED_RELEASES_RELEASE_ID_COLUMN,
  COLLECTIONS_AUTHOR_COLUMN,
  COLLECTIONS_CATEGORY_COLUMN,
  COLLECTIONS_METADATA_COLUMN,
  COLLECTIONS_NAME_COLUMN,
  COLLECTIONS_RELEASES_COLUMN,
  COLLECTIONS_THUMBNAIL_COLUMN,
  CONTENT_CATEGORIES_CATEGORY_ID,
  CONTENT_CATEGORIES_DISPLAY_NAME,
  CONTENT_CATEGORIES_METADATA_SCHEMA,
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
} from "./consts.js";

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
  "contentCategoriesCategoryIdVar",
  "contentCategoriesDisplayNameVar",
  "contentCategoriesMetadataSchemaVar",
] as const;

export type VariableIds = Record<(typeof variableIdKeys)[number], string>;

export type PossiblyIncompleteVariableIds = Partial<VariableIds>;

export type OrbiterConfig = {
  siteId: string;
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
    type: "object",
    properties: {
      siteId: { type: "string", nullable: true },
      variableIds: {
        type: "object",
        nullable: true,
        properties: Object.fromEntries(
          variableIdKeys.map((v) => [v, { type: "string", nullable: true }]),
        ) as { [P in keyof VariableIds]: { type: "string"; nullable: true } },
        required: [],
      },
    },
    required: [],
  };
export const orbiterConfigSchema: JSONSchemaType<OrbiterConfig> = {
  type: "object",
  properties: {
    siteId: { type: "string" },
    variableIds: {
      type: "object",
      properties: Object.fromEntries(
        variableIdKeys.map((v) => [v, { type: "string" }]),
      ) as { [P in keyof VariableIds]: { type: "string" } },
      required: variableIdKeys,
    },
  },
  required: ["siteId", "variableIds"],
};

export type ConfigMode = "vite" | "json"; // Todo: add for other compilers?

export type Release<T = string> = {
  [RELEASES_NAME_COLUMN]: string;
  [RELEASES_FILE_COLUMN]: string;
  [RELEASES_AUTHOR_COLUMN]: string;
  [RELEASES_CATEGORY_COLUMN]: string;
  [RELEASES_THUMBNAIL_COLUMN]?: string;
  [RELEASES_COVER_COLUMN]?: string;
  [RELEASES_METADATA_COLUMN]?: T;
};

export type ReleaseWithId<T = string> = {
  id: string;
  release: Release<T>;
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

export const releasesFileSchema: JSONSchemaType<Release<Record<string, unknown>>[]> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      [RELEASES_NAME_COLUMN]: { type: "string" },
      [RELEASES_FILE_COLUMN]: { type: "string" },
      [RELEASES_AUTHOR_COLUMN]: { type: "string" },
      [RELEASES_CATEGORY_COLUMN]: { type: "string",
      },
      [RELEASES_THUMBNAIL_COLUMN]: { type: "string", nullable: true },
      [RELEASES_COVER_COLUMN]: { type: "string", nullable: true },
      [RELEASES_METADATA_COLUMN]: {
        type: "object",
        nullable: true,
        additionalProperties: true,
      },
    },
    required: [
      RELEASES_NAME_COLUMN,
      RELEASES_FILE_COLUMN,
      RELEASES_AUTHOR_COLUMN,
      RELEASES_CATEGORY_COLUMN,
    ],
  },
};

export type ContentCategory<T = string> = {
  [CONTENT_CATEGORIES_CATEGORY_ID]: string;
  [CONTENT_CATEGORIES_DISPLAY_NAME]: string;
  [CONTENT_CATEGORIES_METADATA_SCHEMA]: T;
};

export type ContentCategoryMetadataField = Record<string, {
  type: "string" | "number" | "array";
  description: string;
  options?: string[];
}>;

export type ContentCategoryWithId<T = string> = {
  id: string;
  contentCategory: ContentCategory<T>;
};

export const categoriesFileSchema: JSONSchemaType<ContentCategory<ContentCategoryMetadataField>[]> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      [CONTENT_CATEGORIES_CATEGORY_ID]: { type: "string" },
      [CONTENT_CATEGORIES_DISPLAY_NAME]: { type: "string" },
      [CONTENT_CATEGORIES_METADATA_SCHEMA]: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["string", "number", "array"],
            },
            description: { type: "string" },
            options: { 
              type: "array",
              items: { type: "string" },
              nullable: true,
            },
          },
          required: ["type", "description"],
        },
        required: [],
      }
    },
    required: [CONTENT_CATEGORIES_CATEGORY_ID, CONTENT_CATEGORIES_DISPLAY_NAME, CONTENT_CATEGORIES_METADATA_SCHEMA],
  },
};