import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/supabase';
import { AuthService } from '../../../core/auth.service';
import { ContributionsListComponent } from '../../contributions/contributions-list/contributions-list';

@Component({
  selector: 'app-chit-group-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ContributionsListComponent
  ],
  templateUrl: './chit-group-list.html',
  styleUrl: './chit-group-list.scss',
})
export class ChitGroupListComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  public authService = inject(AuthService);

  chitGroups = signal<any[]>([]);
  isLoading = signal(true);
  showCreateDialog = signal(false);
  error = signal<string | null>(null);

  // Form Signals
  newName = signal('');
  newAmount = signal<number | null>(null);
  newDuration = signal<number | null>(null);
  isSubmitting = signal(false);
  isEditMode = signal(false);
  selectedGroupId = signal<string | null>(null);

  // Members Signals
  showMembersDialog = signal(false);
  selectedGroupForMembers = signal<any>(null);
  availableUsers = signal<any[]>([]);
  selectedUserId = signal<string | null>(null);
  isLoadingUsers = signal(false);
  successMessage = signal<string | null>(null);
  isRemovingMember = signal(false);

  // Contributions Signals
  showContributionsDialog = signal(false);
  selectedGroupForContributions = signal<any>(null);

  // Modal Signals
  showConfirmDeleteMember = signal(false);
  memberToRemove = signal<any>(null);

  // Group Members Signal: Store members for each group ID
  groupMembers = signal<Record<string, any[]>>({});

  async ngOnInit() {
    this.fetchChitGroups();
  }

  async fetchChitGroups() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabaseService.client
        .from('chit_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.error.set('Failed to fetch chit groups');
        console.error('Error fetching chit groups:', error);
      } else {
        const groups = data ?? [];
        this.chitGroups.set(groups);

        // Fetch members for each group
        for (const group of groups) {
          this.fetchMembersForGroup(group.id);
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      this.error.set('An unexpected error occurred');
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchMembersForGroup(groupId: string) {
    try {
      // Using View for safe member lookup
      const { data, error } = await this.supabaseService.client
        .from('v_chit_group_members')
        .select('user_id, email')
        .eq('chit_group_id', groupId);

      if (error) {
        console.error(`Error fetching members for group ${groupId}:`, error);
        return;
      }

      this.groupMembers.update(prev => ({
        ...prev,
        [groupId]: data || []
      }));
    } catch (err) {
      console.error(`Unexpected error fetching members for group ${groupId}:`, err);
    }
  }

  openCreateDialog() {
    this.resetForm();
    this.showCreateDialog.set(true);
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
    this.resetForm();
  }

  resetForm() {
    this.newName.set('');
    this.newAmount.set(null);
    this.newDuration.set(null);
    this.isSubmitting.set(false);
    this.isEditMode.set(false);
    this.selectedGroupId.set(null);
    this.showMembersDialog.set(false);
    this.selectedGroupForMembers.set(null);
    this.availableUsers.set([]);
    this.selectedUserId.set(null);
    this.error.set(null);
    this.successMessage.set(null);
    this.isRemovingMember.set(false);
    this.showContributionsDialog.set(false);
    this.selectedGroupForContributions.set(null);
  }

  async onSaveChitGroup() {
    if (!this.newName() || !this.newAmount() || !this.newDuration()) {
      this.error.set('Please fill all fields');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      if (this.isEditMode()) {
        const { error } = await this.supabaseService.client
          .from('chit_groups')
          .update({
            name: this.newName(),
            total_amount: this.newAmount(),
            installments: this.newDuration()
          })
          .eq('id', this.selectedGroupId());

        if (error) {
          this.error.set(error.message);
        } else {
          this.closeCreateDialog();
          this.fetchChitGroups();
        }
      } else {
        const { error } = await this.supabaseService.client
          .from('chit_groups')
          .insert({
            name: this.newName(),
            total_amount: this.newAmount(),
            installments: this.newDuration(),
            tenant_id: this.authService.tenantId()
          });

        if (error) {
          this.error.set(error.message);
        } else {
          this.closeCreateDialog();
          this.fetchChitGroups();
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      this.error.set('Failed to save group');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onDeleteChitGroup(group: any) {
    if (!confirm(`Are you sure you want to delete "${group.name}"?`)) return;

    this.isLoading.set(true);
    try {
      const { error } = await this.supabaseService.client
        .from('chit_groups')
        .delete()
        .eq('id', group.id);

      if (error) {
        this.error.set(error.message);
      } else {
        this.fetchChitGroups();
      }
    } catch (err) {
      console.error('Unexpected error during deletion:', err);
      this.error.set('Failed to delete group');
    } finally {
      this.isLoading.set(false);
    }
  }

  onEditChitGroup(group: any) {
    this.resetForm();
    this.selectedGroupId.set(group.id);
    this.newName.set(group.name);
    this.newAmount.set(group.total_amount);
    this.newDuration.set(group.installments);
    this.isEditMode.set(true);
    this.showCreateDialog.set(true);
  }

  async onAddMembersAction(group: any) {
    this.resetForm();
    this.selectedGroupForMembers.set(group);
    this.showMembersDialog.set(true);
    await this.fetchEligibleUsers(group);
  }

  onViewContributions(group: any) {
    this.resetForm();
    this.selectedGroupForContributions.set(group);
    this.showContributionsDialog.set(true);
  }

  async fetchEligibleUsers(group: any) {
    this.isLoadingUsers.set(true);
    try {
      const { data: memberData, error: memberError } = await this.supabaseService.client
        .from('chit_members')
        .select('user_id')
        .eq('chit_group_id', group.id);

      if (memberError) throw memberError;

      const memberIds = memberData?.map((m: any) => m.user_id) || [];

      let query = this.supabaseService.client
        .from('v_users_basic')
        .select('id, email')
        .eq('tenant_id', this.authService.tenantId());

      if (memberIds.length > 0) {
        query = query.not('id', 'in', `(${memberIds.join(',')})`);
      }

      const { data: userData, error: userError } = await query;
      if (userError) throw userError;

      this.availableUsers.set(userData || []);
    } catch (err) {
      this.error.set('Failed to fetch eligible users');
      console.error('Error fetching users:', err);
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  async onAddMemberSubmit() {
    if (!this.selectedUserId() || !this.selectedGroupForMembers()) return;

    this.isSubmitting.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const { error } = await this.supabaseService.client
        .from('chit_members')
        .insert({
          tenant_id: this.authService.tenantId(),
          chit_group_id: this.selectedGroupForMembers().id,
          user_id: this.selectedUserId()
        });

      if (error) {
        this.error.set(error.message);
      } else {
        this.successMessage.set('Member added successfully!');
        this.selectedUserId.set(null);
        const groupId = this.selectedGroupForMembers().id;
        await this.fetchEligibleUsers(this.selectedGroupForMembers());
        await this.fetchMembersForGroup(groupId);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      this.error.set('Failed to add member');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onRemoveMember(member: any) {
    if (!member) return;
    this.memberToRemove.set(member);
    this.showConfirmDeleteMember.set(true);
  }

  async confirmRemoveMember() {
    const member = this.memberToRemove();
    const group = this.selectedGroupForMembers();
    if (!group || !member) return;

    this.isRemovingMember.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const { data, error } = await this.supabaseService.client
        .from('chit_members')
        .delete()
        .eq('chit_group_id', group.id)
        .eq('user_id', member.user_id)
        .select();

      if (error) {
        console.error('Error removing member from Supabase:', error);
        this.error.set(error.message);
      } else if (!data || data.length === 0) {
        console.error('No rows deleted from chit_members');
        this.error.set('Failed to remove member: Database did not reflect the change.');
      } else {
        this.successMessage.set('Member removed successfully');

        // Update local state ONLY after successful server deletion
        const removedUserId = member.user_id;
        this.groupMembers.update(prev => ({
          ...prev,
          [group.id]: (prev[group.id] || []).filter(m => m.user_id !== removedUserId)
        }));

        this.showConfirmDeleteMember.set(false);
        this.memberToRemove.set(null);

        // Refresh eligible users list for the dropdown
        await this.fetchEligibleUsers(group);
      }
    } catch (err) {
      console.error('Unexpected error during removal:', err);
      this.error.set('Failed to remove member');
    } finally {
      this.isRemovingMember.set(false);
    }
  }

  closeConfirmDeleteModal() {
    this.showConfirmDeleteMember.set(false);
    this.memberToRemove.set(null);
  }
}
