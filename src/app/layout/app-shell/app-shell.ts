import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

interface NavItem {
    label: string;
    route: string;
    icon: string; // SVG path
}

@Component({
    selector: 'app-app-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './app-shell.html',
    styleUrl: './app-shell.scss'
})
export class AppShellComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    isSidebarOpen = signal(true);
    userEmail = computed(() => this.authService.user()?.email || 'User');
    isAdmin = computed(() => this.authService.isAdmin());

    adminNavItems: NavItem[] = [
        {
            label: 'Chit Groups',
            route: '/app/chit-groups',
            icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' // bars-4 icon
        },
        {
            label: 'Members',
            route: '/app/members', // Future route
            icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.946 5.946 0 0 0-.942 3.198l.001.031c0 .225.012.447.038.666A11.944 11.944 0 0 1 12 21c2.17 0 4.207-.576 5.963-1.584A6.062 6.062 0 0 1 18 18.719m-12 0a5.971 5.971 0 0 1 .941-3.197m0 0A5.995 5.995 0 0 1 12 12.75a5.995 5.995 0 0 1 5.058 2.772' // users icon
        }
    ];

    memberNavItems: NavItem[] = [
        {
            label: 'My Chit Groups',
            route: '/app/member',
            icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' // home icon
        }
    ];

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    async onLogout() {
        await this.authService.logout();
    }
}
