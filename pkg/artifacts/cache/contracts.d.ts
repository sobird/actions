interface CacheEntry {
  id: number;
  key: string;
  version: string;
  size: number;
  complete: boolean;
  started: boolean; // 表示开始上传
  updatedAt: number; // 最后使用时间
  createdAt: number;
}

export interface ArtifactCacheEntry {
  cacheKey?: string
  scope?: string
  cacheVersion?: string
  creationTime?: string
  archiveLocation?: string
}

export interface ArtifactCacheList {
  totalCount: number
  artifactCaches?: ArtifactCacheEntry[]
}

export interface CommitCacheRequest {
  size: number
}

export interface ReserveCacheRequest {
  key: string
  version?: string
  cacheSize?: number
}

export interface ReserveCacheResponse {
  cacheId: number
}

export interface InternalCacheOptions {
  compressionMethod?: CompressionMethod
  enableCrossOsArchive?: boolean
  cacheSize?: number
}

export interface ArchiveTool {
  path: string
  type: string
}
