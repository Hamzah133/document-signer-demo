import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Document Signer</h1>
        <p class="subtitle">{{ isLogin ? 'Sign in to your account' : 'Create your account' }}</p>
        
        <form (ngSubmit)="submit()">
          <input type="email" [(ngModel)]="email" name="email" placeholder="Email" required />
          <input type="password" [(ngModel)]="password" name="password" placeholder="Password" required />
          <button type="submit" class="primary">{{ isLogin ? 'Sign In' : 'Sign Up' }}</button>
        </form>
        
        <div class="toggle">
          <span *ngIf="isLogin">Don't have an account? <a (click)="isLogin = false">Sign up</a></span>
          <span *ngIf="!isLogin">Already have an account? <a (click)="isLogin = true">Sign in</a></span>
        </div>
        
        <div class="error" *ngIf="error">{{ error }}</div>
        <!-- <div class="demo-hint">Demo: demo&#64;example.com / demo123</div> -->
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-main);
    }
    .login-card {
      background: var(--bg-surface);
      padding: 48px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 420px;
    }
    h1 {
      margin: 0 0 8px 0;
      text-align: center;
      color: var(--text-primary);
      font-size: 32px;
      font-weight: 700;
    }
    .subtitle {
      text-align: center;
      color: var(--text-secondary);
      margin-bottom: 32px;
      font-size: 15px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      margin-bottom: 16px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 15px;
      transition: border 0.2s;
    }
    input:focus {
      outline: none;
      border-color: var(--brand-primary);
    }
    button.primary {
      width: 100%;
      padding: 12px;
      background: var(--brand-primary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s;
    }
    button.primary:hover {
      background: var(--brand-hover);
      transform: translateY(-1px);
    }
    .toggle {
      text-align: center;
      margin-top: 24px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    .toggle a {
      color: var(--brand-primary);
      cursor: pointer;
      text-decoration: none;
      font-weight: 600;
    }
    .error {
      color: var(--status-draft);
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }
    .demo-hint {
      margin-top: 16px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
      padding: 8px;
      background: var(--bg-main);
      border-radius: 6px;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isLogin = true;

  constructor(private authService: AuthService, private router: Router) {}

  submit() {
    const action = this.isLogin ? this.authService.login(this.email, this.password) : this.authService.register(this.email, this.password);
    action.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error = this.isLogin ? 'Invalid credentials' : 'Registration failed'
    });
  }
}
