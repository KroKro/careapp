import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // 'always': Kind-Routen erben Params/Data der Eltern-Route (z. B.
      // :assessmentId der Gutachten-Editor-Shell, siehe gutachten.routes.ts) --
      // Default waere 'emptyOnly' und wuerde assessmentId in allen Kapitel-/
      // Modul-Komponenten auf null setzen, da deren eigene Pfadsegmente das
      // Param nicht erneut enthalten.
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      // Ohne das landet nach "Weiter" das naechste Modul/Kapitel an der
      // Scroll-Position der vorherigen Seite -- man muss manuell hochscrollen.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
