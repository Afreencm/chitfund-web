import { Routes } from '@angular/router';
import { ChitGroupListComponent } from './features/chit-groups/chit-group-list/chit-group-list';
import { LoginComponent } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './layout/app-shell/app-shell';
import { MemberDashboardComponent } from './features/member/dashboard/member-dashboard';
import { MemberChitGroupDetailComponent } from './features/member/chit-group-detail/member-chit-group-detail';
import { LandingComponent } from './features/landing/landing';
import { JoinComponent } from './features/auth/join/join';
import { MemberListComponent } from './features/members/member-list/member-list';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'register-org',
        component: LandingComponent
    },
    {
        path: 'join/:tenantId',
        component: JoinComponent
    },
    {
        path: 'app',
        component: AppShellComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'chit-groups',
                component: ChitGroupListComponent,
                data: { role: 'admin' }
            },
            {
                path: 'member',
                component: MemberDashboardComponent,
                data: { role: 'member' }
            },
            {
                path: 'member/chit-groups/:id',
                component: MemberChitGroupDetailComponent,
                data: { role: 'member' }
            },
            {
                path: 'members',
                component: MemberListComponent,
                data: { role: 'admin' }
            },
            {
                path: '',
                redirectTo: 'chit-groups',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
