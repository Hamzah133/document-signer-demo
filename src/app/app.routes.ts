import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent)
    },
    {
        path: 'editor',
        loadComponent: () => import('./home/home').then(m => m.Home)
    },
    {
        path: 'editor/:id',
        loadComponent: () => import('./home/home').then(m => m.Home)
    },
    {
        path: 'sign/:token',
        loadComponent: () => import('./sign/sign').then(m => m.SignComponent)
    }
];
