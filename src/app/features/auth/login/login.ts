import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink
    ],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    mouseX = 0;
    mouseY = 0;

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        this.mouseX = (event.clientX / window.innerWidth) * 100;
        this.mouseY = (event.clientY / window.innerHeight) * 100;

        // Update CSS variables for high-performance background interaction
        document.documentElement.style.setProperty('--mouse-x', `${this.mouseX}%`);
        document.documentElement.style.setProperty('--mouse-y', `${this.mouseY}%`);
    }

    email = '';
    password = '';
    rememberMe = false;
    loading = false;
    error: string | null = null;

    async handleLogin() {
        if (!this.email || !this.password) {
            this.error = 'Please fill in all fields';
            return;
        }

        this.loading = true;
        this.error = null;

        try {
            const { data, error } = await this.authService.signIn(this.email, this.password);

            if (error) {
                this.error = error.message;
                console.error('Login error:', error);
            } else if (data.user) {
                // Successful login
                // Redirect based on the role which is refreshed by AuthService automatically.
                if (this.authService.isAdmin()) {
                    this.router.navigate(['/app/chit-groups']);
                } else {
                    this.router.navigate(['/app/member']);
                }
            }
        } catch (err: any) {
            this.error = 'An unexpected error occurred';
            console.error('Unexpected error:', err);
        } finally {
            this.loading = false;
        }
    }
}
