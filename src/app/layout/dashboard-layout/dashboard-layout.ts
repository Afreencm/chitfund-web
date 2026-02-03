import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';

@Component({
    selector: 'app-dashboard-layout',
    standalone: true,
    imports: [
        RouterOutlet,
        ButtonModule,
        ToolbarModule,
        MenuModule
    ],
    templateUrl: './dashboard-layout.html',
    styleUrl: './dashboard-layout.scss'
})
export class DashboardLayoutComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    sidebarVisible = true;

    menuItems = computed<MenuItem[]>(() => {
        const isAdmin = this.authService.isAdmin();
        const items = [];

        if (isAdmin) {
            items.push({
                label: 'Administration',
                items: [
                    {
                        label: 'Chit Groups',
                        icon: 'pi pi-list',
                        routerLink: '/app/chit-groups'
                    }
                ]
            });
        } else {
            items.push({
                label: 'Member Area',
                items: [
                    {
                        label: 'My Chit Groups',
                        icon: 'pi pi-home',
                        routerLink: '/app/member'
                    }
                ]
            });
        }

        return items;
    });

    async onLogout() {
        await this.authService.logout();
        this.router.navigate(['/login']);
    }

    toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
    }
}
