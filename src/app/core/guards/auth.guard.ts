import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Block until auth is ready (session and role are resolved)
    return toObservable(authService.authReady).pipe(
        filter(ready => ready === true),
        take(1),
        map(() => {
            const user = authService.user();
            const role = authService.role();
            const requiredRole = route.data['role'];

            console.log('[AuthGuard] Checking route:', state.url);
            console.log('[AuthGuard] User:', user?.email, '| Role:', role, '| Required:', requiredRole);

            if (!authService.isAuthenticated()) {
                console.warn('[AuthGuard] Not authenticated, redirecting to login');
                router.navigate(['/login']);
                return false;
            }

            // Role-based authorization
            if (requiredRole) {
                if (requiredRole === 'admin' && !authService.isAdmin()) {
                    console.warn('[AuthGuard] Admin role required, user is member. Redirecting...');
                    router.navigate(['/app/member']);
                    return false;
                }

                if (requiredRole === 'member' && authService.isAdmin()) {
                    console.warn('[AuthGuard] Member role required, user is admin. Redirecting...');
                    router.navigate(['/app/chit-groups']);
                    return false;
                }
            }

            console.log('[AuthGuard] Access granted');
            return true;
        })
    );
};
