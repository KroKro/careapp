import { Routes } from '@angular/router';

export const WIDERSPRUCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./widerspruch-home/widerspruch-home.component').then((m) => m.WiderspruchHomeComponent),
  },
  {
    path: ':letterId',
    loadComponent: () =>
      import('./widerspruch-form/widerspruch-form.component').then((m) => m.WiderspruchFormComponent),
  },
];
