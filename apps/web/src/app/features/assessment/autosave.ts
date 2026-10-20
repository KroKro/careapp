import { Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Speichert einen Formular-Entwurf automatisch im Hintergrund, debounced
 * (keine Anfrage pro Tastenanschlag). Noetig seit die Gutachten-Reiterleiste
 * freies Springen zwischen Abschnitten erlaubt (gutachten-editor-shell) --
 * vorher wurde nur beim expliziten "Weiter"-Klick gespeichert, wodurch beim
 * Wechseln ueber einen Reiter unbemerkt Eingaben verloren gingen.
 */
export function autosaveOnChange<T>(
  changes$: Observable<T>,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): Subscription {
  return changes$.pipe(debounceTime(delayMs)).subscribe((value) => {
    save(value).catch(() => {
      // Stilles Scheitern: ein fehlgeschlagener Hintergrund-Save soll den
      // Nutzer nicht unterbrechen -- der naechste Werteaenderungs-Trigger
      // oder der explizite "Weiter"-Klick versucht es erneut.
    });
  });
}
