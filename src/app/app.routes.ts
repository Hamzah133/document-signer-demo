import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login'
    },
    {
        path: 'login',
        loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: 'editor',
        loadComponent: () => import('./home/home').then(m => m.Home),
        canActivate: [authGuard]
    },
    {
        path: 'editor/:id',
        loadComponent: () => import('./home/home').then(m => m.Home),
        canActivate: [authGuard]
    },
    {
        path: 'sign/:token',
        loadComponent: () => import('./sign/sign').then(m => m.SignComponent)
    }
];
