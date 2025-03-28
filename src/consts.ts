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
  trustedSitesSiteIdVar: "/orbitdb/zdpuAwapnjEwFwWSjXxzcvDypXXjfLGXSChHF6cUPgNUthEJf",
  trustedSitesNameVar: "/orbitdb/zdpuAsuiXPa4go6gAnKmD33K18MLd4XTGTb5JhE1NyTaxuF25",
  featuredReleasesReleaseIdVar: "/orbitdb/zdpuAxWTbRzgExEv8gyXqzqLSoQiTvtZ1a5jyp2xDrkE1wYTa",
  featuredReleasesStartTimeVar: "/orbitdb/zdpuAtKvMTKcJoRNTczTK3dLVR3vMrP3eagFPUMbXJEkVxoLp",
  featuredReleasesEndTimeVar: "/orbitdb/zdpuAnEuqR87b6ECMfAHHFw8yX4bgqNcNJefsKhvCWpmVzChX",
  blockedReleasesReleaseIdVar: "/orbitdb/zdpuAyindpd8NqhQ4ao4ZpU8eFCUXkpCzn3A3jcF9P9YqEUnu",
  contentCategoriesCategoryIdVar: "/orbitdb/zdpuAsXnFTcRPfJywWbe774VrhbfLxPBVZfrfM5xPvSYyfVHZ",
  contentCategoriesDisplayNameVar: "/orbitdb/zdpuAnHoy7GuBR4ikJfrPjyc4Cm1Yx8qbzV3KKdJxUbdHozWN",
  contentCategoriesMetadataSchemaVar: "/orbitdb/zdpuB1L8AXd7xYh3tPPM7MBBxNiQDPfV9n8Rt4JkRK9rW7sXJ",
  releasesFileVar: "/orbitdb/zdpuAp5YGHgxsjs1QUJX2bYwLDK22V7Gf79m7SPeZhXy9LsiH",
  releasesAuthorVar: "/orbitdb/zdpuAzqhnJQnoS7P1nbmdzJtQ8Vi4n2VLUWi1D7iPghvFkEm7",
  releasesContentNameVar: "/orbitdb/zdpuB15wfgTPSazoxdbt5D9UMhTbnqkqBTXAo1uWe4F6B8514",
  releasesThumbnailVar: "/orbitdb/zdpuAptC1ZQafFAqMoAqP1xPgNhQc8Rd3YCHLoq529d59RHek",
  releasesCoverVar: "/orbitdb/zdpuAysVN5zt1utf4DqVS6w5L3SpAWK3TxxBe4pmnHHEquoVr",
  releasesMetadataVar: "/orbitdb/zdpuArqWuk5ENQiUKUHYnqAP2dLApACKSLCtgY1hCK4AYRTHz",
  releasesCategoryVar: "/orbitdb/zdpuAq1tNjCKNypDkdBU9ZxkjdR2xepYkDsTpm15MUyojgdfR",
  collectionsAuthorVar: "/orbitdb/zdpuAtm5fMVa66nj2EW65bosvMZ2rsSvHgmPc8gUfzCVarxAL",
  collectionsMetadataVar: "/orbitdb/zdpuB1c4D3BJu1rsNAbXJqaSZ8JL1QxswEiGHdnTAfQgWqGA9",
  collectionsNameVar: "/orbitdb/zdpuAxJwMcwaZB9JQ6NkCUmKJYDuezuqWQjPfk7fxYBQZLorS",
  collectionsThumbnailVar: "/orbitdb/zdpuB3DPsrNiifdTqhqUgvBCePqMYi1ftvHhq8mvuvDNvszcr",
  collectionsReleasesVar: "/orbitdb/zdpuAu1KqKhQm5pXwPKqCvYFD7nRKmZaFHW19JuP7oBpYQeXm",
  collectionsCategoryVar: "/orbitdb/zdpuAxhjVXv5gkjtDK8VoZ2jvst3LKCP97s7WuepTsyuyq1Xnf"
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