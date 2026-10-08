import { Routes } from '@angular/router';

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
  },
  {
    path: ':assessmentId/module/2',
    loadComponent: () => import('./module-2/module-2-step.component').then((m) => m.Module2StepComponent),
  },
  {
    path: ':assessmentId/module/3',
    loadComponent: () => import('./module-3/module-3-step.component').then((m) => m.Module3StepComponent),
  },
  {
    path: ':assessmentId/module/4',
    loadComponent: () => import('./module-4/module-4-step.component').then((m) => m.Module4StepComponent),
  },
  {
    path: ':assessmentId/module/5',
    loadComponent: () => import('./module-5/module-5-step.component').then((m) => m.Module5StepComponent),
  },
  {
    path: ':assessmentId/module/6',
    loadComponent: () => import('./module-6/module-6-step.component').then((m) => m.Module6StepComponent),
  },
  {
    path: ':assessmentId/summary',
    loadComponent: () => import('./summary/summary.component').then((m) => m.SummaryComponent),
  },
];
