import { Component, Input, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getSupabaseClient } from '../../../core/supabase.client';
import { AuthService } from '../../../core/auth.service';
import { FormsModule } from '@angular/forms';

export interface Contribution {
    id: string;
    installment_no: number;
    amount: number;
    status: 'paid' | 'unpaid';
    paid_at: string | null;
    user_id: string;
}

@Component({
    selector: 'app-contributions-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './contributions-list.html',
    styles: [`
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
            height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
        }
    `]
})
export class ContributionsListComponent implements OnInit {
    @Input() chitGroupId!: string;

    private supabase = getSupabaseClient();
    public authService = inject(AuthService);

    isAdmin = computed(() => this.authService.isAdmin());

    contributions = signal<Contribution[]>([]);
    loading = signal(true);
    fetchError = signal<string | null>(null);
    formError = signal<string | null>(null);

    // Form Signals
    showAddForm = signal(false);
    isSubmitting = signal(false);
    groupMembers = signal<any[]>([]);

    // Form fields
    formAmount = signal<number | null>(null);
    formInstallmentNo = signal<number | null>(1);
    formStatus = signal<'paid' | 'unpaid'>('unpaid');
    formPaidAt = signal<string | null>(null);
    selectedMemberId = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    async ngOnInit() {
        if (this.chitGroupId) {
            await Promise.all([
                this.fetchContributions(),
                this.isAdmin() ? this.fetchGroupMembers() : Promise.resolve()
            ]);
        }
    }

    async fetchContributions() {
        try {
            this.loading.set(true);
            this.fetchError.set(null);

            const { data, error } = await this.supabase
                .from('chit_contributions')
                .select(`
                    id,
                    installment_no,
                    amount,
                    status,
                    paid_at,
                    user_id
                `)
                .eq('chit_group_id', this.chitGroupId)
                .order('installment_no', { ascending: true });

            if (error) {
                console.error('[ContributionsList] Error fetching data:', error.message);
                this.fetchError.set(error.message);
            } else {
                this.contributions.set(data as Contribution[] || []);
            }
        } catch (err: any) {
            console.error('[ContributionsList] Unexpected error:', err);
            this.fetchError.set('An unexpected error occurred');
        } finally {
            this.loading.set(false);
        }
    }

    async fetchGroupMembers() {
        try {
            // Using View for safe email lookup
            const { data, error } = await this.supabase
                .from('v_chit_group_members')
                .select('user_id, email')
                .eq('chit_group_id', this.chitGroupId);

            console.log('[fetchGroupMembers] data:', data);

            if (error) throw error;

            this.groupMembers.set(data?.map(m => ({
                id: m.user_id,
                email: m.email || 'Unknown Member'
            })) || []);
        } catch (err) {
            console.error('[ContributionsList] Error fetching members:', err);
        }
    }

    resetForm() {
        this.formAmount.set(null);
        this.formInstallmentNo.set((this.contributions()[this.contributions().length - 1]?.installment_no || 0) + 1);
        this.formStatus.set('unpaid');
        this.formPaidAt.set(null);
        this.selectedMemberId.set(null);
        this.fetchError.set(null);
        this.formError.set(null);
        this.successMessage.set(null);
    }

    toggleAddForm() {
        if (!this.showAddForm()) {
            this.resetForm();
        }
        this.showAddForm.update(v => !v);
    }

    async onSaveContribution() {
        if (!this.formAmount() || !this.formInstallmentNo() || !this.selectedMemberId()) {
            this.formError.set('Please fill required fields');
            return;
        }

        this.isSubmitting.set(true);
        this.formError.set(null);
        this.successMessage.set(null);

        // Client-side validation for unique constraint
        const isDuplicate = this.contributions().some(c =>
            c.user_id === this.selectedMemberId() &&
            c.installment_no === this.formInstallmentNo()
        );

        if (isDuplicate) {
            this.formError.set('This member already has a record for this installment number');
            this.isSubmitting.set(false);
            return;
        }

        try {
            const { error } = await this.supabase
                .from('chit_contributions')
                .insert({
                    chit_group_id: this.chitGroupId,
                    user_id: this.selectedMemberId(),
                    amount: this.formAmount(),
                    installment_no: this.formInstallmentNo(),
                    status: this.formStatus(),
                    paid_at: this.formStatus() === 'paid' ? (this.formPaidAt() || new Date().toISOString()) : null,
                    tenant_id: this.authService.tenantId()
                });

            if (error) throw error;

            this.successMessage.set('Contribution added successfully!');
            await this.fetchContributions();
            this.showAddForm.set(false);
        } catch (err: any) {
            console.error('[ContributionsList] Save error:', err);
            this.formError.set(err.message || 'Failed to save contribution');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
