import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AirtableAuthService } from './services/airtable-auth.service';

const authGuard = () => {
  const auth = inject(AirtableAuthService);
  const router = inject(Router);
  return auth.hasValidToken() ? true : router.createUrlTree(['/connect']);
};

const noAuthGuard = () => {
  const auth = inject(AirtableAuthService);
  const router = inject(Router);
  return auth.hasValidToken() ? router.createUrlTree(['/dashboard']) : true;
};

export const routes: Routes = [
  { path: '', redirectTo: 'connect', pathMatch: 'full' },
  {
    path: 'connect',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./connect/connect.component').then(m => m.ConnectComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  { path: '**', redirectTo: 'connect' },
];
