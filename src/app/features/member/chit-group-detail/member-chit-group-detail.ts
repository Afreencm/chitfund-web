import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/supabase';
import { AuthService } from '../../../core/auth.service';

@Component({
    selector: 'app-member-chit-group-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink
    ],
    templateUrl: './member-chit-group-detail.html',
    styleUrl: './member-chit-group-detail.scss'
})
export class MemberChitGroupDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private supabaseService = inject(SupabaseService);
    public authService = inject(AuthService);

    chitGroup = signal<any | null>(null);
    membershipInfo = signal<any | null>(null);
    isLoading = signal(true);
    error = signal<string | null>(null);

    monthlyContribution = computed(() => {
        const group = this.chitGroup();
        if (group && group.amount && group.duration) {
            return group.amount / group.duration;
        }
        return 0;
    });

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            await this.fetchGroupDetail(id);
        } else {
            this.isLoading.set(false);
            this.error.set('Invalid group ID');
        }
    }

    async fetchGroupDetail(id: string) {
        this.isLoading.set(true);
        this.error.set(null);
        try {
            // 1. Fetch Group Details
            const { data: groupData, error: groupError } = await this.supabaseService.client
                .from('chit_groups')
                .select('*')
                .eq('id', id)
                .single();

            if (groupError) throw groupError;
            this.chitGroup.set(groupData);

            // 2. Fetch My Membership Info
            const user = this.authService.user();
            if (user) {
                const { data: memberData, error: memberError } = await this.supabaseService.client
                    .from('chit_members')
                    .select('*')
                    .eq('chit_group_id', id)
                    .eq('user_id', user.id)
                    .single();

                if (memberError && memberError.code !== 'PGRST116') {
                    console.error('Error fetching membership info:', memberError);
                } else {
                    this.membershipInfo.set(memberData);
                }
            }
        } catch (err: any) {
            console.error('Error fetching group details:', err);
            this.error.set('Failed to fetch details');
        } finally {
            this.isLoading.set(false);
        }
    }
}
