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
        <p class="subtitle">Sign in to manage your documents</p>
        
        <form (ngSubmit)="login()">
          <input type="email" [(ngModel)]="email" name="email" placeholder="Email" required />
          <input type="password" [(ngModel)]="password" name="password" placeholder="Password" required />
          <button type="submit" class="primary">Sign In</button>
        </form>
        
        <div class="error" *ngIf="error">{{ error }}</div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
    }
    .login-card {
      background: white;
      padding: 48px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    h1 {
      margin: 0 0 8px 0;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      color: #6b7280;
      margin-bottom: 32px;
    }
    input {
      width: 100%;
      padding: 12px;
      margin-bottom: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button.primary {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .error {
      color: #ef4444;
      margin-top: 16px;
      text-align: center;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => this.error = 'Invalid credentials'
    });
  }
}
