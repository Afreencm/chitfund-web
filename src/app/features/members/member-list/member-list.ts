import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { getSupabaseClient } from '../../../core/supabase.client';

interface OrganizationMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Members</h1>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Manage your organization's team</p>
        </div>

        <!-- Join Link Section -->
        <div class="bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-center gap-4 border border-indigo-500/20">
          <div class="text-center md:text-left">
            <p class="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Invite New Members</p>
            <p class="text-xs font-bold text-white max-w-[200px] truncate opacity-80">{{ joinLink() }}</p>
          </div>
          <button (click)="copyJoinLink()" 
            class="h-9 px-6 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-sm">
            {{ copyStatus() }}
          </button>
        </div>
      </div>

      <!-- Members Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest">Team Members</h2>
          <span class="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {{ members().length }} Total
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Joined</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngFor="let member of members()" class="group hover:bg-slate-50/50 transition-all">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                      {{ member.email.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-bold text-slate-900 tracking-tight">{{ member.email }}</p>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Account</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span [class]="getRoleClass(member.role)" class="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border">
                    {{ member.role }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <span class="text-[11px] font-bold text-slate-500 tabular-nums">{{ member.created_at | date:'mediumDate' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="members().length === 0 && !isLoading()" class="p-20 text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-300">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-slate-900 mb-1 tracking-tight">No Members Yet</h3>
          <p class="text-xs text-slate-400 font-medium">Use the join link above to invite your team.</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="p-20 flex flex-col items-center justify-center gap-4">
          <div class="w-10 h-10 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching members...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-super_admin { @apply bg-indigo-50 text-indigo-600 border-indigo-100; }
    .role-admin { @apply bg-slate-50 text-slate-600 border-slate-100; }
    .role-member { @apply bg-emerald-50 text-emerald-600 border-emerald-100; }
  `]
})
export class MemberListComponent implements OnInit {
  private authService = inject(AuthService);
  private supabase = getSupabaseClient();

  members = signal<OrganizationMember[]>([]);
  isLoading = signal(true);
  copyStatus = signal('Copy Link');

  joinLink = computed(() => {
    const tenantId = this.authService.tenantId();
    if (!tenantId) return 'No Tenant ID Found';
    return `${window.location.origin}/join/${tenantId}`;
  });

  async ngOnInit() {
    this.fetchMembers();
  }

  async fetchMembers() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.members.set(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async copyJoinLink() {
    try {
      await navigator.clipboard.writeText(this.joinLink());
      this.copyStatus.set('Copied!');
      setTimeout(() => this.copyStatus.set('Copy Link'), 2000);
    } catch (err) {
      console.error('Failed to copy join link:', err);
    }
  }

  getRoleClass(role: string): string {
    return `role-${role}`;
  }
}
