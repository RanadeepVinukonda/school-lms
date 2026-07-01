import { getSupabaseAdmin } from '../services/supabase';

export class ConnectionManager {
  private static _instance: ConnectionManager;
  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager._instance) {
      ConnectionManager._instance = new ConnectionManager();
    }
    return ConnectionManager._instance;
  }

  getClient() {
    const client = getSupabaseAdmin();
    if (!client) throw new Error('Supabase client not initialized');
    return client;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const client = this.getClient();
      const { error } = await client.from('nosql_docs').select('count').limit(1).maybeSingle();
      return !error;
    } catch {
      return false;
    }
  }
}
