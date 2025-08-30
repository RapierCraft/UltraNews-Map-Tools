'use client';

interface TileData {
  key: string;
  data: ArrayBuffer;
  timestamp: number;
  url: string;
  z: number;
  x: number;
  y: number;
  size: number;
  type: 'tile' | 'building';
}

interface CacheStats {
  totalSize: number;
  tileCount: number;
  hitRate: number;
  missRate: number;
}

class VectorTileCache {
  private db: IDBDatabase | null = null;
  private dbName = 'mapVectorCache';
  private dbVersion = 2;
  private storeName = 'tiles';
  private buildingsStoreName = 'buildings';
  private maxCacheSize = 100 * 1024 * 1024; // 100MB cache limit
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('url', 'url');
          store.createIndex('zoom', 'z');
          store.createIndex('type', 'type');
        }
        
        if (!db.objectStoreNames.contains(this.buildingsStoreName)) {
          const buildingsStore = db.createObjectStore(this.buildingsStoreName, { keyPath: 'key' });
          buildingsStore.createIndex('timestamp', 'timestamp');
          buildingsStore.createIndex('url', 'url');
          buildingsStore.createIndex('zoom', 'z');
        }
      };
    });
  }

  private generateTileKey(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): string {
    return `${type}_${provider}_${z}_${x}_${y}`;
  }

  async get(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): Promise<ArrayBuffer | null> {
    if (!this.db) return null;

    this.stats.totalRequests++;
    
    try {
      const storeName = type === 'building' ? this.buildingsStoreName : this.storeName;
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const key = this.generateTileKey(provider, z, x, y, type);
      
      const request = store.get(key);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result as TileData | undefined;
          
          if (result && (Date.now() - result.timestamp < this.maxAge)) {
            this.stats.hits++;
            resolve(result.data);
          } else {
            this.stats.misses++;
            if (result) {
              this.delete(provider, z, x, y, type);
            }
            resolve(null);
          }
        };
        
        request.onerror = () => {
          this.stats.misses++;
          resolve(null);
        };
      });
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  async set(provider: string, z: number, x: number, y: number, data: ArrayBuffer, url: string, type: 'tile' | 'building' = 'tile'): Promise<void> {
    if (!this.db) return;

    try {
      const currentSize = await this.getCacheSize();
      const dataSize = data.byteLength;
      
      if (currentSize + dataSize > this.maxCacheSize) {
        await this.cleanupOldEntries();
      }

      const storeName = type === 'building' ? this.buildingsStoreName : this.storeName;
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const key = this.generateTileKey(provider, z, x, y, type);
      
      const tileData: TileData = {
        key,
        data,
        timestamp: Date.now(),
        url,
        z,
        x,
        y,
        size: dataSize,
        type
      };

      store.put(tileData);
    } catch (error) {
      // Silent cache errors
    }
  }

  async delete(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): Promise<void> {
    if (!this.db) return;

    try {
      const storeName = type === 'building' ? this.buildingsStoreName : this.storeName;
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const key = this.generateTileKey(provider, z, x, y, type);
      
      store.delete(key);
    } catch (error) {
      // Silent cache errors
    }
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction([this.storeName, this.buildingsStoreName], 'readonly');
      
      const tilesStore = transaction.objectStore(this.storeName);
      const buildingsStore = transaction.objectStore(this.buildingsStoreName);
      
      const tilesRequest = tilesStore.getAll();
      const buildingsRequest = buildingsStore.getAll();
      
      return new Promise((resolve) => {
        let tilesSize = 0;
        let buildingsSize = 0;
        let completed = 0;
        
        const checkComplete = () => {
          if (++completed === 2) {
            resolve(tilesSize + buildingsSize);
          }
        };
        
        tilesRequest.onsuccess = () => {
          const tiles = tilesRequest.result as TileData[];
          tilesSize = tiles.reduce((sum, tile) => sum + tile.size, 0);
          checkComplete();
        };
        
        buildingsRequest.onsuccess = () => {
          const buildings = buildingsRequest.result as TileData[];
          buildingsSize = buildings.reduce((sum, building) => sum + building.size, 0);
          checkComplete();
        };
        
        tilesRequest.onerror = () => checkComplete();
        buildingsRequest.onerror = () => checkComplete();
      });
    } catch (error) {
      return 0;
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    const totalSize = await this.getCacheSize();
    const tileCount = await this.getTileCount();
    
    return {
      totalSize,
      tileCount,
      hitRate: this.stats.totalRequests > 0 ? (this.stats.hits / this.stats.totalRequests) * 100 : 0,
      missRate: this.stats.totalRequests > 0 ? (this.stats.misses / this.stats.totalRequests) * 100 : 0
    };
  }

  async getTileCount(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction([this.storeName, this.buildingsStoreName], 'readonly');
      
      const tilesStore = transaction.objectStore(this.storeName);
      const buildingsStore = transaction.objectStore(this.buildingsStoreName);
      
      const tilesRequest = tilesStore.count();
      const buildingsRequest = buildingsStore.count();
      
      return new Promise((resolve) => {
        let tilesCount = 0;
        let buildingsCount = 0;
        let completed = 0;
        
        const checkComplete = () => {
          if (++completed === 2) {
            resolve(tilesCount + buildingsCount);
          }
        };
        
        tilesRequest.onsuccess = () => {
          tilesCount = tilesRequest.result;
          checkComplete();
        };
        
        buildingsRequest.onsuccess = () => {
          buildingsCount = buildingsRequest.result;
          checkComplete();
        };
        
        tilesRequest.onerror = () => checkComplete();
        buildingsRequest.onerror = () => checkComplete();
      });
    } catch (error) {
      return 0;
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName, this.buildingsStoreName], 'readwrite');
      
      // Clean up tiles
      const tilesStore = transaction.objectStore(this.storeName);
      const tilesIndex = tilesStore.index('timestamp');
      const cutoffTime = Date.now() - this.maxAge;
      
      const tilesRequest = tilesIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
      tilesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          tilesStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      
      // Clean up buildings
      const buildingsStore = transaction.objectStore(this.buildingsStoreName);
      const buildingsIndex = buildingsStore.index('timestamp');
      
      const buildingsRequest = buildingsIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
      buildingsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          buildingsStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch (error) {
      // Silent cache cleanup errors
    }
  }

  async prefetchTilesAroundArea(provider: string, centerZ: number, centerX: number, centerY: number, radius: number = 2, includeBuildingData: boolean = true): Promise<void> {
    if (!this.db) return;

    const promises: Promise<void>[] = [];
    
    // Prefetch tiles in a radius around the center tile
    for (let z = Math.max(0, centerZ - 1); z <= Math.min(18, centerZ + 1); z++) {
      const scale = Math.pow(2, z - centerZ);
      const scaledX = Math.floor(centerX * scale);
      const scaledY = Math.floor(centerY * scale);
      
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = scaledX + dx;
          const y = scaledY + dy;
          
          const maxCoord = Math.pow(2, z);
          if (x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) continue;
          
          // Check if tile is already cached
          const cachedTile = await this.get(provider, z, x, y, 'tile');
          if (!cachedTile) {
            promises.push(this.prefetchSingleTile(provider, z, x, y, 'tile'));
          }
          
          // Also prefetch building data for zoom levels where buildings are visible
          if (includeBuildingData && z >= 12) {
            const cachedBuilding = await this.get(provider, z, x, y, 'building');
            if (!cachedBuilding) {
              promises.push(this.prefetchSingleTile(provider, z, x, y, 'building'));
            }
          }
        }
      }
    }
    
    // Execute prefetch requests in batches
    const batchSize = 5;
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      await Promise.all(batch);
      
      if (i + batchSize < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async prefetchSingleTile(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): Promise<void> {
    try {
      const url = this.buildTileUrl(provider, z, x, y, type);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.arrayBuffer();
        await this.set(provider, z, x, y, data, url, type);
      }
    } catch (error) {
      // Silent prefetch errors
    }
  }

  private buildTileUrl(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): string {
    const tileServerBase = `http://localhost:8001/api/v1`;
    if (type === 'building') {
      return `${tileServerBase}/buildings/${provider}/${z}/${x}/${y}.json`;
    }
    return `${tileServerBase}/tiles/${provider}/${z}/${x}/${y}.png`;
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName, this.buildingsStoreName], 'readwrite');
      
      const tilesStore = transaction.objectStore(this.storeName);
      const buildingsStore = transaction.objectStore(this.buildingsStoreName);
      
      tilesStore.clear();
      buildingsStore.clear();
      
      this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    } catch (error) {
      // Silent cache errors
    }
  }

  async cachedFetch(provider: string, z: number, x: number, y: number, type: 'tile' | 'building' = 'tile'): Promise<Response> {
    const cachedData = await this.get(provider, z, x, y, type);
    
    if (cachedData) {
      return new Response(cachedData, {
        status: 200,
        headers: {
          'Content-Type': type === 'building' ? 'application/json' : 'image/png',
          'Cache-Control': 'max-age=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    const url = this.buildTileUrl(provider, z, x, y, type);
    
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.arrayBuffer();
        await this.set(provider, z, x, y, data, url, type);
        
        return new Response(data, {
          status: response.status,
          headers: {
            'Content-Type': type === 'building' ? 'application/json' : 'image/png',
            'Cache-Control': 'max-age=86400',
            'X-Cache': 'MISS'
          }
        });
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Global cache instance - only create on client side
let cacheInstance: VectorTileCache | null = null;

export function getVectorCache(): VectorTileCache | null {
  if (typeof window === 'undefined') {
    return null; // Return null on server side
  }
  
  if (!cacheInstance) {
    try {
      cacheInstance = new VectorTileCache();
    } catch (error) {
      console.warn('Failed to initialize vector cache:', error);
      return null;
    }
  }
  return cacheInstance;
}

export { VectorTileCache };
export type { CacheStats, TileData };