import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/supabase';
import { AuthService } from '../../../core/auth.service';
import { ContributionsListComponent } from '../../contributions/contributions-list/contributions-list';

@Component({
    selector: 'app-member-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ContributionsListComponent
    ],
    templateUrl: './member-dashboard.html',
    styleUrl: './member-dashboard.scss'
})
export class MemberDashboardComponent implements OnInit {
    private supabaseService = inject(SupabaseService);
    public authService = inject(AuthService);

    chitGroups = signal<any[]>([]);
    isLoading = signal(true);
    error = signal<string | null>(null);

    // Contributions Dialog
    showContributionsDialog = signal(false);
    selectedGroupForContributions = signal<any>(null);

    async ngOnInit() {
        this.fetchMyChitGroups();
    }

    async fetchMyChitGroups() {
        this.isLoading.set(true);
        this.error.set(null);
        try {
            const { data, error } = await this.supabaseService.client
                .from('chit_groups')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                this.error.set('Failed to fetch your chit groups');
                console.error('Error fetching chit groups:', error);
            } else {
                this.chitGroups.set(data ?? []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            this.error.set('An unexpected error occurred');
        } finally {
            this.isLoading.set(false);
        }
    }

    onViewContributions(group: any, event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.selectedGroupForContributions.set(group);
        this.showContributionsDialog.set(true);
    }

    closeContributionsDialog() {
        this.showContributionsDialog.set(false);
        this.selectedGroupForContributions.set(null);
    }
}
