import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

export type UserRole = 'super_admin' | 'admin' | 'member';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private static initialized = false;
    private supabase = getSupabaseClient();
    private router = inject(Router);
    private authSubscription: { unsubscribe: () => void } | null = null;

    // Signals for state
    private _session = signal<Session | null>(null);
    private _role = signal<UserRole | null>(null);
    private _tenantId = signal<string | null>(null);
    public authReady = signal(false);

    // Computed signals
    readonly session = this._session.asReadonly();
    readonly user = computed<User | null>(() => this._session()?.user ?? null);
    readonly isAuthenticated = computed(() => !!this._session());
    readonly role = this._role.asReadonly();
    readonly tenantId = this._tenantId.asReadonly();
    readonly isAdmin = computed(() => this.role() === 'admin' || this.role() === 'super_admin');

    constructor() {
        // STRICT Singleton Guard: Ensure initializeAuth runs EXACTLY ONCE globally
        if (!AuthService.initialized) {
            AuthService.initialized = true;
            this.initializeAuth();
        }
    }

    private async initializeAuth() {
        try {
            console.log('[AuthService] Initializing auth...');
            this.authReady.set(false);

            // Unsubscribe existing listener if any before re-registering
            if (this.authSubscription) {
                this.authSubscription.unsubscribe();
                this.authSubscription = null;
            }

            // Get initial session exactly once
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.warn('AuthService: Error during getSession:', error.message);
            }

            await this.updateSession(session);

            console.log('[AuthService] Initial session resolved. Ready: true');
            this.authReady.set(true);

            // Register exactly one listener and store its subscription
            const { data: { subscription } } = this.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[AuthService] onAuthStateChange fired:', event);

                try {
                    // If it's a significant event, we toggle ready while we resolve the session/role
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
                        this.authReady.set(false);
                        await this.updateSession(session);

                        // Centralized navigation on SIGNED_OUT
                        if (event === 'SIGNED_OUT') {
                            console.log('[AuthService] SIGNED_OUT detected, navigating to login...');
                            this.router.navigate(['/login']);
                        }

                        console.log(`[AuthService] Auth state resolved for event: ${event}`);
                    } else {
                        await this.updateSession(session);
                    }
                } catch (err) {
                    console.error('[AuthService] Error in onAuthStateChange handler:', err);
                } finally {
                    // CRITICAL: Always ensure ready is true to unblock UI/Guards
                    if (!this.authReady()) {
                        this.authReady.set(true);
                    }
                }
            });

            this.authSubscription = subscription;
        } catch (err: any) {
            if (err.name === 'NavigatorLockAcquireTimeoutError') {
                console.error('AuthService: CRITICAL - Supabase Lock Timeout.');
            } else {
                console.error('AuthService: Unexpected error during auth initialization:', err);
            }
            this.authReady.set(true); // Unblock guards
        }
    }

    private async updateSession(session: Session | null) {
        this._session.set(session);
        if (session?.user) {
            await this.refreshUserRole(session.user.id);
        } else {
            this._role.set(null);
            this._tenantId.set(null);
        }
    }

    public async refreshUserRole(userId: string): Promise<UserRole | null> {
        try {
            console.log('[AuthService] Fetching role for user:', userId);
            const { data, error } = await this.supabase
                .from('users')
                .select('role, tenant_id')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[AuthService] Error fetching user data:', error.message);
                this._role.set(null);
                this._tenantId.set(null);
                return null;
            } else {
                const role = data?.role as UserRole || null;
                const tenantId = data?.tenant_id || null;
                console.log('[AuthService] Resolved -> Role:', role, '| Tenant:', tenantId);
                this._role.set(role);
                this._tenantId.set(tenantId);
                return role;
            }
        } catch (err) {
            console.error('[AuthService] Unexpected error fetching user data:', err);
            this._role.set(null);
            this._tenantId.set(null);
            return null;
        }
    }

    public async signIn(email: string, password: string) {
        return await this.supabase.auth.signInWithPassword({
            email,
            password
        });
    }

    async logout() {
        try {
            console.log('[AuthService] Executing logout...');
            // 1. Trigger Supabase Sign Out
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                console.error('Error during supabase.auth.signOut():', error.message);
            }
        } catch (err) {
            console.error('Unexpected error during logout:', err);
        } finally {
            // 2. ALWAYS clear local state regardless of server-side success
            // This ensures the UI reflects logged-out state even if offline or session is already invalid
            console.log('[AuthService] Cleaning up local session state');
            await this.updateSession(null);
            this.authReady.set(true);
            this.router.navigate(['/login']);
        }
    }
}
