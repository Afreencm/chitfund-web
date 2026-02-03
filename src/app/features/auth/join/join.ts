import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { getSupabaseClient } from '../../../core/supabase.client';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-wrapper flex items-center justify-center p-4 sm:p-4">
      <div class="w-full sm:max-w-[420px] bg-white sm:p-8 p-6 sm:rounded-xl sm:border sm:border-slate-200/50 sm:shadow-2xl">
        <!-- Logo & Header -->
        <div class="flex flex-col items-center mb-8 sm:mb-8">
            <img src="/SyncFund.png" alt="SyncFund Logo" class="object-contain mb-6 sm:mb-4" style="width: 240px;">
            <p class="text-xs sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Join <span class="text-indigo-600 font-black">{{ tenantName() || 'Organization' }}</span>
            </p>
        </div>

        <form (submit)="onSubmit($event)" class="space-y-5 sm:space-y-4">
            <div class="space-y-2 sm:space-y-1.5">
              <label class="block text-xs sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Email Address</label>
              <input type="email" [(ngModel)]="email" name="email" required
                class="w-full h-12 sm:h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300 text-base sm:text-sm font-medium"
                placeholder="name@company.com">
            </div>

            <div class="space-y-2 sm:space-y-1.5">
              <label class="block text-xs sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Password</label>
              <input type="password" [(ngModel)]="password" name="password" required
                class="w-full h-12 sm:h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300 text-base sm:text-sm font-medium"
                placeholder="••••••••">
            </div>

            <div *ngIf="message()" class="p-3 bg-indigo-50 border border-indigo-100 rounded-lg animate-in fade-in zoom-in-95">
              <p class="text-xs sm:text-[11px] font-bold text-indigo-600 uppercase tracking-tight text-center leading-tight">{{ message() }}</p>
            </div>

            <div *ngIf="error()" class="p-3.5 sm:p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2.5 animate-shake">
                <svg class="w-5 h-5 sm:w-4 sm:h-4 text-rose-500 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm sm:text-xs font-semibold text-rose-600 leading-tight">{{ error() }}</p>
            </div>

            <button type="submit" [disabled]="isLoading() || !tenantId"
              class="w-full h-12 sm:h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-bold text-base sm:text-sm shadow-lg sm:shadow-sm shadow-indigo-200 sm:shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <span *ngIf="!isLoading()">Join Organization</span>
              <svg *ngIf="isLoading()" class="animate-spin h-5 w-5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </button>
        </form>

        <!-- Footer -->
        <div class="mt-8 text-center pt-6 border-t border-slate-100">
            <p class="text-sm sm:text-xs font-medium text-slate-500">
                Already have an account?
                <a routerLink="/login" class="text-indigo-600 hover:text-indigo-700 font-bold ml-1 transition-colors">Sign In</a>
            </p>
        </div>
      </div>
    </div>
  `
})
export class JoinComponent implements OnInit {
  private supabase = getSupabaseClient();
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mouseX = 0;
  mouseY = 0;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX / window.innerWidth) * 100;
    this.mouseY = (event.clientY / window.innerHeight) * 100;

    document.documentElement.style.setProperty('--mouse-x', `${this.mouseX}%`);
    document.documentElement.style.setProperty('--mouse-y', `${this.mouseY}%`);
  }

  tenantId: string | null = null;
  tenantName = signal<string | null>(null);

  email = '';
  password = '';
  isLoading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  async ngOnInit() {
    this.tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (this.tenantId) {
      this.fetchTenantInfo();
    } else {
      this.error.set('Invalid Join Link');
    }
  }

  async fetchTenantInfo() {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('name')
      .eq('id', this.tenantId)
      .single();

    if (data) this.tenantName.set(data.name);
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    if (this.isLoading() || !this.tenantId) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      // 1. Sign up Member
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: this.email,
        password: this.password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create Profile (Member) linked to this tenant
      const { error: profileError } = await this.supabase
        .from('users')
        .insert({
          id: authData.user.id,
          tenant_id: this.tenantId,
          email: this.email,
          role: 'member'
        });

      if (profileError) throw profileError;

      // 3. Handle Email Confirmation or Redirect
      if (!authData.session) {
        this.message.set('Registration successful! Please confirm your email before signing in.');
      } else {
        this.router.navigate(['/app/member']);
      }

    } catch (err: any) {
      console.error('[Join] Error:', err);
      this.error.set(err.message || 'Failed to join organization');
    } finally {
      this.isLoading.set(false);
    }
  }
}
