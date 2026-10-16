import { Routes } from '@angular/router';

// basePath wird von den wiederverwendeten Modul-/Summary-Komponenten
// gelesen (route.snapshot.data['basePath']), damit dieselben Komponenten
// auch unter /gutachten (siehe gutachten.routes.ts) korrekt navigieren.
const BASE_PATH = '/assessment';

export const ASSESSMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./assessment-home/assessment-home.component').then(
        (m) => m.AssessmentHomeComponent,
      ),
  },
  {
    path: ':assessmentId/module/1',
    loadComponent: () => import('./module-1/module-1-step.component').then((m) => m.Module1StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/module/2',
    loadComponent: () => import('./module-2/module-2-step.component').then((m) => m.Module2StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/module/3',
    loadComponent: () => import('./module-3/module-3-step.component').then((m) => m.Module3StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/module/4',
    loadComponent: () => import('./module-4/module-4-step.component').then((m) => m.Module4StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/module/5',
    loadComponent: () => import('./module-5/module-5-step.component').then((m) => m.Module5StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/module/6',
    loadComponent: () => import('./module-6/module-6-step.component').then((m) => m.Module6StepComponent),
    data: { basePath: BASE_PATH },
  },
  {
    path: ':assessmentId/summary',
    loadComponent: () => import('./summary/summary.component').then((m) => m.SummaryComponent),
    data: { basePath: BASE_PATH },
  },
];
