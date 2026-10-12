import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-home/admin-home.component').then((m) => m.AdminHomeComponent),
  },
  {
    path: 'guide-templates',
    loadComponent: () =>
      import('./guide-templates/guide-templates-page.component').then((m) => m.GuideTemplatesPageComponent),
  },
  {
    path: 'scoring-rulesets',
    loadComponent: () =>
      import('./scoring-rulesets/scoring-rulesets-page.component').then(
        (m) => m.ScoringRulesetsPageComponent,
      ),
  },
  {
    path: 'users',
    loadComponent: () => import('./users/admin-users-page.component').then((m) => m.AdminUsersPageComponent),
  },
];
