import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // 'always': Kind-Routen erben Params/Data der Eltern-Route (z. B.
    // :assessmentId der Gutachten-Editor-Shell, siehe gutachten.routes.ts) --
    // Default waere 'emptyOnly' und wuerde assessmentId in allen Kapitel-/
    // Modul-Komponenten auf null setzen, da deren eigene Pfadsegmente das
    // Param nicht erneut enthalten.
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
  ],
};
