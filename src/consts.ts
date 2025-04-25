import { ContentCategory, ContentCategoryMetadataField } from "./types";

export const TRUSTED_SITES_TABLE_KEY = "trustedSites";
export const TRUSTED_SITES_SITE_ID_COL = "siteId";
export const TRUSTED_SITES_NAME_COL = "siteName";

export const FEATURED_RELEASES_TABLE_KEY = "featuredReleases";
export const FEATURED_RELEASES_RELEASE_ID_COLUMN = "releaseId";
export const FEATURED_RELEASES_START_TIME_COLUMN = "startTime";
export const FEATURED_RELEASES_END_TIME_COLUMN = "endTime";

export const BLOCKED_RELEASES_TABLE_KEY = "blockedReleases";
export const BLOCKED_RELEASES_RELEASE_ID_COLUMN = "releaseId";

export const CONTENT_CATEGORIES_TABLE_KEY = "contentCategories";
export const CONTENT_CATEGORIES_CATEGORY_ID = "categoryId";
export const CONTENT_CATEGORIES_DISPLAY_NAME = "displayName";
export const CONTENT_CATEGORIES_METADATA_SCHEMA = "metadataSchema";

export const RELEASES_FILE_COLUMN = "file";
export const RELEASES_AUTHOR_COLUMN = "author";
export const RELEASES_NAME_COLUMN = "contentName";
export const RELEASES_METADATA_COLUMN = "metadata";
export const RELEASES_THUMBNAIL_COLUMN = "thumbnail";
export const RELEASES_CATEGORY_COLUMN = "category";
export const RELEASES_COVER_COLUMN = "cover";

export const COLLECTIONS_RELEASES_COLUMN = "releases";
export const COLLECTIONS_AUTHOR_COLUMN = "author";
export const COLLECTIONS_NAME_COLUMN = "contentName";
export const COLLECTIONS_METADATA_COLUMN = "metadata";
export const COLLECTIONS_THUMBNAIL_COLUMN = "thumbnail";
export const COLLECTIONS_CATEGORY_COLUMN = "category";

export const RELEASES_DB_TABLE_KEY = "releases";
export const COLLECTIONS_DB_TABLE_KEY = "collections";

export const CONFIG_FILE_NAME = ".orbiter-config.json";
export const DEFAULT_ORBITER_DIR = ".orbiter";

export const DEFAULT_VARIABLE_IDS = {
  trustedSitesSiteIdVar: "/orbitdb/zdpuB2wkkeLz6ydHKpsS77vDNRHbasD8JYExS9hY4jBVZqKkf",
  trustedSitesNameVar: "/orbitdb/zdpuArhaMLFcttwWrd5RuHgfS4tV9GcitBKcNwarvQLr9VDFi",
  featuredReleasesReleaseIdVar: "/orbitdb/zdpuAuoH7hoTZvBuAxG667k5YMSZaCQXU8Y88CoRG57vjZLaZ",
  featuredReleasesStartTimeVar: "/orbitdb/zdpuArQnMwqU1jN9eZ9J6k8H1euLRF67qVkeWjU9NBTAf4HLQ",
  featuredReleasesEndTimeVar: "/orbitdb/zdpuArhQVb8NYLXu8oyEbKZmdwGmPWXACxrYBR49zGkGyo2NV",
  blockedReleasesReleaseIdVar: "/orbitdb/zdpuAkyAA7XiPurjxZ39b2s5Vt57Z5dqnr6TSgMap5wP1qYBi",
  contentCategoriesCategoryIdVar: "/orbitdb/zdpuAtrNCjNSKf8hBM6rrqC4prVvsNph3Wt7E4Y2W8pFvGDXx",
  contentCategoriesDisplayNameVar: "/orbitdb/zdpuAzKVn6Ep8feK8uCtu9GFJGPK2Z3mEmPcg2STKAuGEsKdz",
  contentCategoriesMetadataSchemaVar: "/orbitdb/zdpuAnJewUq9HZwExebbauea47Fw2v5JWtxhVufn3UZZBhTsW",
  releasesFileVar: "/orbitdb/zdpuAopp994ERCjk8Gb8D6m1kqSk5RoW9mq1Xsb9yogqgdGcX",
  releasesAuthorVar: "/orbitdb/zdpuAwK1RDcoYe9XxN7G3eohtC6xrquybseqNUqsJMuMA1gKN",
  releasesContentNameVar: "/orbitdb/zdpuB1DGtFGEJDVNzxQuVzixjzT3MNH2cpxqBZBcVgDXVt17j",
  releasesThumbnailVar: "/orbitdb/zdpuAxWrRcBpPYkmBXr7XQLVB721ZbBomncpKf7UMrGgVxqau",
  releasesCoverVar: "/orbitdb/zdpuAx9oHfCHQ4AuMGjACVi9nze5wfKDW9h6NzXVyfv1ZV93t",
  releasesMetadataVar: "/orbitdb/zdpuAwPUmxyTjE26e4LLMNFtnQvaaUeVyQczS2GQjX6MaWzXu",
  releasesCategoryVar: "/orbitdb/zdpuArKo58rLT9WawJScfBMh83H68UXrgdVC2FCvwCZVqJ7fA",
  collectionsAuthorVar: "/orbitdb/zdpuAvM6HdN4tRWMTC2Gyqx9WhgiT3xap2N3cK5JLQUqrxeLS",
  collectionsMetadataVar: "/orbitdb/zdpuAuScb292oiKL8DZsdPcQieFbUo64Nz8UMy8W2r6omv6f3",
  collectionsNameVar: "/orbitdb/zdpuB29yexzEQ8xjFHWU5WPnGsR74cNVHRyp2ynKHFLr3ycsh",
  collectionsThumbnailVar: "/orbitdb/zdpuAv4xkPWt2sy8uRRsyqvUK18nkJgR23MbEd85FRbtiG73k",
  collectionsReleasesVar: "/orbitdb/zdpuAt2rnT1gYeQxgVcL6B35k7c7JEWWUTtNTQ8xxous6a13N",
  collectionsCategoryVar: "/orbitdb/zdpuAvAND67Sjsc2csTnJZEdJ5xURyT79PpB5gWX6fVjixvak"
}

export const DEFAULT_CONTENT_CATEGORIES: ContentCategory<ContentCategoryMetadataField>[] = [
  {
    categoryId: "music",
    displayName: "Music",
    metadataSchema: {
      totalSongs: {
        type:  "number",
        description: "Total number of songs in this category"
      },
      totalDuration: {
        type: "string",
        description: "Total duration of all songs (e.g., in HH:MM:SS format)"
      },
      genres: {
        type: "array",
        description: "List of genres represented in this category"
      },
      tags: {
        type: "string",
        description: "Tags associated with the music release"
      },
      musicBrainzID: {
        type: "string",
        description: "MusicBrainz identifier for the release"
      },
      albumTitle: {
        type: "string",
        description: "Title of the album"
      },
      releaseYear: {
        type: "number",
        description: "Year of release"
      },
      releaseType: {
        type: "string",
        description: "Type of music release",
        options: [
          'Album',
          'Soundtrack',
          'EP',
          'Anthology',
          'Compilation',
          'Single',
          'Live Album',
          'Remix',
          'Bootleg',
          'Interview',
          'Mixtape',
          'Demo',
          'Concert Recording',
          'DJ Mix',
          'Unknown',
        ],        
      },
      fileFormat: {
        type: "string",
        description: "Audio file format",
        options: ['MP3', 'FLAC', 'AAC', 'AC3', 'DTS'],
      },
      bitrate: {
        type: "string",
        description: "Audio bitrate (e.g., 320kbps)"
      },
      mediaFormat: {
        type: "string",
        description: "Physical media format if applicable",
        options: ['CD', 'DVD', 'Vinyl', 'Soundboard', 'SACD', 'DAT', 'WEB', 'Blu-Ray'],
      }
    }
  },
  {
    categoryId: "video",
    displayName: "Videos",
    metadataSchema: {
      resolution: {
        type: "string",
        description: "Video resolution (e.g., 1920x1080)"
      },
      format: {
        type: "string",
        description: "File format of the video (e.g., mp4, mov)"
      },
      genres: {
        type: "array",
        description: "Genres associated with the video (e.g., action, drama)"
      },
      tags: {
        type: "array",
        description: "User-defined tags for searchability (e.g., funny, tutorial)"
      },
      posterCID: {
        type: "string",
        description: "Content ID for the movie poster"
      },
      TMDBID: {
        type: "string",
        description: "The Movie Database identifier"
      },
      IMDBID: {
        type: "string",
        description: "Internet Movie Database identifier"
      },
      releaseType: {
        type: "string",
        description: "Type of movie release"
      },
      releaseYear: {
        type: "number",
        description: "Year of release"
      },
      classification: {
        type: "string",
        description: "Content rating/classification (e.g., PG-13)"
      },
      duration: {
        type: "string",
        description: "Length of the movie"
      }
    }
  },
  {
    categoryId: "tvShow",
    displayName: "TV Shows",
    metadataSchema: {
      seasons: {
        type: "number",
        description: "Number of seasons in the TV show"
      }
    }
  }
]