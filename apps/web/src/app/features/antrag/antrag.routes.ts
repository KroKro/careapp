import { Routes } from '@angular/router';

export const ANTRAG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./antrag-home/antrag-home.component').then((m) => m.AntragHomeComponent),
  },
  {
    path: ':applicationId',
    loadComponent: () => import('./antrag-form/antrag-form.component').then((m) => m.AntragFormComponent),
  },
];
