/**
 * Query result caching system
 *
 * File-based cache for query analysis results to avoid redundant API calls.
 * Stores results keyed by SHA-256 hash of normalized query.
 *
 * Features:
 * - Configurable TTL (default 24h)
 * - Automatic cache invalidation for time-sensitive queries
 * - Max entries limit with LRU eviction
 * - Cache statistics
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { EnsembleResult, QueryAnalysisResult } from './types.ts';

export interface CacheConfig {
  enabled: boolean;
  cacheDir: string;
  ttlHours: number;
  maxEntries: number;
  bypassKeywords: string[]; // Keywords that bypass cache (e.g., "latest", "current")
}

export interface CacheEntry {
  query: string;
  normalizedQuery: string;
  result: QueryAnalysisResult | EnsembleResult;
  cachedAt: string;
  expiresAt: string;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  totalSizeBytes: number;
}

/**
 * Load cache config from settings.json if available
 */
function loadSettingsConfig(): Partial<CacheConfig> {
  const paiDir = process.env.PAI_DIR || `${process.env.HOME}/Projects/PAI/.claude`;
  const settingsPath = join(paiDir, 'settings.json');

  try {
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      const cacheSettings = settings?.adaptiveResearch?.cache;
      if (cacheSettings) {
        return {
          enabled: cacheSettings.enabled ?? true,
          ttlHours: cacheSettings.ttlHours,
          maxEntries: cacheSettings.maxEntries,
          bypassKeywords: cacheSettings.bypassKeywords,
        };
      }
    }
  } catch (_error) {
    console.error('⚠️ Failed to load cache config from settings.json, using defaults');
  }
  return {};
}

const SETTINGS_CONFIG = loadSettingsConfig();

const DEFAULT_CONFIG: CacheConfig = {
  enabled: SETTINGS_CONFIG.enabled ?? true,
  cacheDir: join(process.env.HOME || '~', '.cache', 'PAI', 'query-analyzer'),
  ttlHours: SETTINGS_CONFIG.ttlHours ?? 24,
  maxEntries: SETTINGS_CONFIG.maxEntries ?? 1000,
  bypassKeywords: SETTINGS_CONFIG.bypassKeywords ?? [
    'latest',
    'current',
    'today',
    'now',
    'recent',
    'breaking',
    '2025',
  ],
};

export class QueryCache {
  private config: CacheConfig;
  private stats: { hits: number; misses: number };
  private indexPath: string;
  private entriesDir: string;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { hits: 0, misses: 0 };
    this.indexPath = join(this.config.cacheDir, 'cache-index.json');
    this.entriesDir = join(this.config.cacheDir, 'entries');

    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!existsSync(this.config.cacheDir)) {
      mkdirSync(this.config.cacheDir, { recursive: true });
    }
    if (!existsSync(this.entriesDir)) {
      mkdirSync(this.entriesDir, { recursive: true });
    }
  }

  /**
   * Normalize query for consistent hashing
   */
  normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove punctuation for fuzzy matching
  }

  /**
   * Generate cache key (SHA-256 hash of normalized query)
   */
  getCacheKey(query: string): string {
    const normalized = this.normalizeQuery(query);
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Check if query should bypass cache (time-sensitive keywords)
   */
  shouldBypassCache(query: string): boolean {
    if (!this.config.enabled) return true;

    const lowerQuery = query.toLowerCase();
    return this.config.bypassKeywords.some((keyword) => lowerQuery.includes(keyword));
  }

  /**
   * Get cached result if exists and not expired
   */
  get(query: string): QueryAnalysisResult | EnsembleResult | null {
    if (this.shouldBypassCache(query)) {
      console.error('⏭️  Cache bypass: time-sensitive query');
      this.stats.misses++;
      return null;
    }

    const key = this.getCacheKey(query);
    const entryPath = join(this.entriesDir, `${key}.json`);

    if (!existsSync(entryPath)) {
      this.stats.misses++;
      return null;
    }

    try {
      const entry: CacheEntry = JSON.parse(readFileSync(entryPath, 'utf-8'));

      // Check expiration
      if (new Date(entry.expiresAt) < new Date()) {
        console.error('⏰ Cache expired, removing entry');
        unlinkSync(entryPath);
        this.stats.misses++;
        return null;
      }

      // Update hit count
      entry.hitCount++;
      writeFileSync(entryPath, JSON.stringify(entry, null, 2));

      this.stats.hits++;
      console.error(`✅ Cache HIT (key: ${key}, hits: ${entry.hitCount})`);
      return entry.result;
    } catch (error) {
      console.error(`⚠️  Cache read error: ${error}`);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store result in cache
   */
  set(query: string, result: QueryAnalysisResult | EnsembleResult): void {
    if (!this.config.enabled || this.shouldBypassCache(query)) {
      return;
    }

    const key = this.getCacheKey(query);
    const entryPath = join(this.entriesDir, `${key}.json`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.ttlHours * 60 * 60 * 1000);

    const entry: CacheEntry = {
      query,
      normalizedQuery: this.normalizeQuery(query),
      result,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hitCount: 0,
    };

    try {
      // Check max entries limit
      this.enforceMaxEntries();

      writeFileSync(entryPath, JSON.stringify(entry, null, 2));
      console.error(`💾 Cache SET (key: ${key}, expires: ${this.config.ttlHours}h)`);
    } catch (error) {
      console.error(`⚠️  Cache write error: ${error}`);
    }
  }

  /**
   * Enforce max entries limit using LRU eviction
   */
  private enforceMaxEntries(): void {
    const entries = this.listEntries();

    if (entries.length >= this.config.maxEntries) {
      // Sort by last access time (oldest first)
      entries.sort((a, b) => {
        const aPath = join(this.entriesDir, `${a}.json`);
        const bPath = join(this.entriesDir, `${b}.json`);
        return statSync(aPath).mtimeMs - statSync(bPath).mtimeMs;
      });

      // Remove oldest 10%
      const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
      for (let i = 0; i < toRemove; i++) {
        const entryPath = join(this.entriesDir, `${entries[i]}.json`);
        try {
          unlinkSync(entryPath);
          console.error(`🗑️  Evicted cache entry: ${entries[i]}`);
        } catch {
          // Ignore deletion errors
        }
      }
    }
  }

  /**
   * List all cache entry keys
   */
  private listEntries(): string[] {
    if (!existsSync(this.entriesDir)) return [];

    return readdirSync(this.entriesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entries = this.listEntries();
    for (const entry of entries) {
      const entryPath = join(this.entriesDir, `${entry}.json`);
      try {
        unlinkSync(entryPath);
      } catch {
        // Ignore deletion errors
      }
    }
    console.error(`🗑️  Cleared ${entries.length} cache entries`);
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const entries = this.listEntries();
    let pruned = 0;

    for (const entryKey of entries) {
      const entryPath = join(this.entriesDir, `${entryKey}.json`);
      try {
        const entry: CacheEntry = JSON.parse(readFileSync(entryPath, 'utf-8'));
        if (new Date(entry.expiresAt) < new Date()) {
          unlinkSync(entryPath);
          pruned++;
        }
      } catch {
        // Remove corrupted entries
        try {
          unlinkSync(entryPath);
          pruned++;
        } catch {
          // Ignore
        }
      }
    }

    console.error(`🧹 Pruned ${pruned} expired cache entries`);
    return pruned;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = this.listEntries();
    let totalSize = 0;
    let oldestTime: Date | null = null;
    let newestTime: Date | null = null;
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;

    for (const entryKey of entries) {
      const entryPath = join(this.entriesDir, `${entryKey}.json`);
      try {
        const stat = statSync(entryPath);
        totalSize += stat.size;

        if (!oldestTime || stat.mtimeMs < oldestTime.getTime()) {
          oldestTime = new Date(stat.mtimeMs);
          oldestEntry = entryKey;
        }
        if (!newestTime || stat.mtimeMs > newestTime.getTime()) {
          newestTime = new Date(stat.mtimeMs);
          newestEntry = entryKey;
        }
      } catch {
        // Ignore stat errors
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: entries.length,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      oldestEntry,
      newestEntry,
      totalSizeBytes: totalSize,
    };
  }
}

// Singleton instance for CLI usage
let cacheInstance: QueryCache | null = null;

export function getCache(config?: Partial<CacheConfig>): QueryCache {
  if (!cacheInstance || config) {
    cacheInstance = new QueryCache(config);
  }
  return cacheInstance;
}

// CLI for cache management
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  const cache = getCache();

  switch (command) {
    case 'stats': {
      const stats = cache.getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'clear':
      cache.clear();
      console.log('Cache cleared');
      break;

    case 'prune': {
      const pruned = cache.prune();
      console.log(`Pruned ${pruned} entries`);
      break;
    }

    case 'get': {
      const query = args.slice(1).join(' ');
      const result = cache.get(query);
      if (result) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('Not found in cache');
      }
      break;
    }

    default:
      console.log(`
Query Cache CLI

Usage:
  bun query-cache.ts stats        Show cache statistics
  bun query-cache.ts clear        Clear all cache entries
  bun query-cache.ts prune        Remove expired entries
  bun query-cache.ts get <query>  Check if query is cached
`);
  }
}
