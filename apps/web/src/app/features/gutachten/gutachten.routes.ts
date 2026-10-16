import { Routes } from '@angular/router';

// Modul 1-6 + Zusammenfassung werden 1:1 aus features/assessment wiederverwendet
// (identische Punkte-Berechnung/Stufentabellen) -- basePath steuert die interne
// Navigation der wiederverwendeten Komponenten, siehe assessment.routes.ts.
const BASE_PATH = '/gutachten';

export const GUTACHTEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./gutachten-home/gutachten-home.component').then((m) => m.GutachtenHomeComponent),
  },
  {
    // Alle Abschnitte eines Gutachtens haengen unter der Editor-Shell, die eine
    // persistente Reiterleiste zeigt -- der Kunde wuenscht freies Hin- und
    // Herspringen zwischen Kapiteln/Modulen wie in der Excel-Vorlage, statt
    // eines strikt linearen Wizards. Die URL-Struktur bleibt dabei unveraendert,
    // nur dieses Routen-Nesting ist neu -- die "Weiter"/"Zurueck"-Navigate-
    // Aufrufe in den einzelnen Schritt-Komponenten (absolute Pfade) funktionieren
    // dadurch unveraendert weiter.
    path: ':assessmentId',
    loadComponent: () =>
      import('./gutachten-editor-shell/gutachten-editor-shell.component').then(
        (m) => m.GutachtenEditorShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'stammdaten' },
      {
        path: 'stammdaten',
        loadComponent: () =>
          import('./stammdaten/stammdaten-step.component').then((m) => m.StammdatenStepComponent),
      },
      {
        path: 'kap1',
        loadComponent: () => import('./kapitel-1/kapitel-1-step.component').then((m) => m.Kapitel1StepComponent),
      },
      {
        path: 'kap2',
        loadComponent: () => import('./kapitel-2/kapitel-2-step.component').then((m) => m.Kapitel2StepComponent),
      },
      {
        path: 'kap3',
        loadComponent: () => import('./kapitel-3/kapitel-3-step.component').then((m) => m.Kapitel3StepComponent),
      },
      {
        path: 'module/1',
        loadComponent: () =>
          import('../assessment/module-1/module-1-step.component').then((m) => m.Module1StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'module/2',
        loadComponent: () =>
          import('../assessment/module-2/module-2-step.component').then((m) => m.Module2StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'module/3',
        loadComponent: () =>
          import('../assessment/module-3/module-3-step.component').then((m) => m.Module3StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'module/4',
        loadComponent: () =>
          import('../assessment/module-4/module-4-step.component').then((m) => m.Module4StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'module/5',
        loadComponent: () =>
          import('../assessment/module-5/module-5-step.component').then((m) => m.Module5StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'module/6',
        loadComponent: () =>
          import('../assessment/module-6/module-6-step.component').then((m) => m.Module6StepComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'summary',
        loadComponent: () =>
          import('../assessment/summary/summary.component').then((m) => m.SummaryComponent),
        data: { basePath: BASE_PATH },
      },
      {
        path: 'kap6',
        loadComponent: () => import('./kapitel-6/kapitel-6-step.component').then((m) => m.Kapitel6StepComponent),
      },
      {
        path: 'kap7',
        loadComponent: () => import('./kapitel-7/kapitel-7-step.component').then((m) => m.Kapitel7StepComponent),
      },
      {
        path: 'kap8',
        loadComponent: () => import('./kapitel-8/kapitel-8-step.component').then((m) => m.Kapitel8StepComponent),
      },
      {
        path: 'kap9',
        loadComponent: () => import('./kapitel-9/kapitel-9-step.component').then((m) => m.Kapitel9StepComponent),
      },
    ],
  },
];
