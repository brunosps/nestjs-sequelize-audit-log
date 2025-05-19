/**
 * Utilitário para gerenciar o cache de respostas
 */
export class ResponseCache {
  private static _instance: ResponseCache;
  private cache: Map<string, Buffer[]>;

  private constructor() {
    this.cache = new Map<string, Buffer[]>();
  }

  public static getInstance(): ResponseCache {
    if (!ResponseCache._instance) {
      ResponseCache._instance = new ResponseCache();
    }
    return ResponseCache._instance;
  }

  public set(key: string, chunks: Buffer[]): void {
    this.cache.set(key, chunks);
  }

  public get(key: string): Buffer[] {
    return this.cache.get(key) || [];
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}

// Exporta uma instância singleton
export const responseCache = ResponseCache.getInstance();
