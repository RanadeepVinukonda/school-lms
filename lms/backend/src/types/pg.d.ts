declare module 'pg' {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
    connect(): Promise<PoolClient>;
  }
  export class Client {
    constructor(config?: Record<string, unknown>);
    connect(): Promise<void>;
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
  export class PoolClient {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    release(): void;
  }
}
