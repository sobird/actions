export interface CacheEntry {
  id: number;
  key: string;
  version: string;
  size: number;
  complete: boolean;
  updatedAt: number; // 最后使用时间
  createdAt: number;
}

export interface ArtifactCacheEntry {
  cacheKey?: string;
  scope?: string;
  cacheVersion?: string;
  creationTime?: string;
  archiveLocation?: string;
}

export interface ArtifactCacheList {
  totalCount: number;
  artifactCaches?: ArtifactCacheEntry[];
}

export interface CommitCacheRequest {
  size: number;
}

export interface ReserveCacheRequest {
  key: string;
  version?: string;
  cacheSize?: number;
}

export interface ReserveCacheResponse {
  cacheId: number;
}

export interface ArchiveTool {
  path: string;
  type: string;
}

export enum ReserveStatus {
  Created, // 新创建
  Exists, // 已存在但未完成（可重用）
  Completed, // 已完成（冲突）
}

export interface ReserveResult {
  status: ReserveStatus;
  cacheId?: number;
  error?: string;
}
