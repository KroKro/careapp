import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard, gutachterGuard } from './core/role.guard';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page/dashboard-page.component').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      {
        path: 'assessment',
        loadChildren: () =>
          import('./features/assessment/assessment.routes').then((m) => m.ASSESSMENT_ROUTES),
      },
      {
        path: 'results/:assessmentId',
        loadComponent: () =>
          import('./features/results/result-page/result-page.component').then(
            (m) => m.ResultPageComponent,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents-page/documents-page.component').then(
            (m) => m.DocumentsPageComponent,
          ),
      },
      {
        path: 'antraege',
        loadChildren: () => import('./features/antrag/antrag.routes').then((m) => m.ANTRAG_ROUTES),
      },
      {
        path: 'informationen',
        loadComponent: () =>
          import('./features/info/info-page/info-page.component').then((m) => m.InfoPageComponent),
      },
      {
        path: 'downloads',
        loadComponent: () =>
          import('./features/downloads/downloads-page/downloads-page.component').then(
            (m) => m.DownloadsPageComponent,
          ),
      },
      {
        path: 'widersprueche',
        loadChildren: () =>
          import('./features/widerspruch/widerspruch.routes').then((m) => m.WIDERSPRUCH_ROUTES),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account-page/account-page.component').then(
            (m) => m.AccountPageComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'gutachten',
        canActivate: [gutachterGuard],
        loadChildren: () =>
          import('./features/gutachten/gutachten.routes').then((m) => m.GUTACHTEN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
