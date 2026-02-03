import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

declare global {
    var __supabaseClient: SupabaseClient | undefined;
}

/**
 * In-Memory Storage Adapter (NO PERSISTENCE, NO LOCKS)
 * This completely bypasses localStorage and Navigator LockManager
 */
class MemoryStorage {
    private store: Map<string, string> = new Map();

    async getItem(key: string): Promise<string | null> {
        return this.store.get(key) || null;
    }

    async setItem(key: string, value: string): Promise<void> {
        this.store.set(key, value);
    }

    async removeItem(key: string): Promise<void> {
        this.store.delete(key);
    }
}

/**
 * TRUE GLOBAL SINGLETON Supabase Client
 * Uses in-memory storage to completely avoid lock issues
 * WARNING: Sessions will NOT persist across page refreshes
 */
export function getSupabaseClient(): SupabaseClient {

    if (!globalThis.__supabaseClient) {
        console.log('[Supabase] Creating singleton client with in-memory storage (NO LOCKS)...');

        globalThis.__supabaseClient = createClient(
            environment.supabaseUrl,
            environment.supabaseAnonKey,
            {
                auth: {
                    persistSession: false, // CRITICAL: Disable persistence
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                    storage: new MemoryStorage() as any,
                    storageKey: 'sb-memory-auth'
                },
                global: {
                    headers: {
                        'X-Client-Info': 'syncfund-web@1.0.0'
                    }
                }
            }
        );

        console.log('[Supabase] ✓ Client initialized (in-memory mode, no locks)');
    }

    return globalThis.__supabaseClient;
}
