# brain.md — Projektstatus & offene Aufgaben

Lebendes Arbeitsdokument für careapp (Pflegegrad-Selbsteinschätzung +
Formulargutachten für "Der QM-Berater"). Architektur-Hintergrund und
Grundsatzentscheidungen stehen in `README.md`; hier geht es nur um **was
als Nächstes zu tun ist**.

> Hinweis: Das Repo ist **nicht** mehr leer/greenfield — Frontend, Backend
> und Edge Functions sind produktiv (Supabase Cloud Frankfurt + Azure
> Static Web Apps). Falls du eine ältere Notiz findest, die noch "Repo ist
> leer" sagt: die ist veraltet.

## Fertig (produktiv im Einsatz)

- Angular-Frontend (Standalone/Signals), TailAdmin-Sidebar-Design.
- Auth-Flow (Login/Register/Passwort vergessen/zurücksetzen) inkl. Art.-9-
  Einwilligungs-Checkbox, Inline-Validierung, Passwort-Sichtbar-Toggle.
- Kompletter 6-Modul-Wizard + Berechnung (`calculate-pflegegrad`),
  verifiziert gegen Excel-Vorlage *und* gegen `neu.xlsx` (offizielles
  Formulargutachten) — Formeln stimmen exakt überein.
- Mehrfach-Einschätzungen pro Account (Liste statt Einzel-Draft), Zurück/
  Abbrechen-Navigation im Wizard.
- Erläuterungstexte pro Antwortoption, Quelle: BRi 2026 (S. 55–96).
- Datei-Upload inkl. Virus-Scan-Flow (`scan-document`, `infra/av-scanner` —
  **Status der tatsächlichen VM-Bereitstellung prüfen, siehe offene
  Punkte unten**).
- Leitfaden-Generierung + PDF-Export (`generate-guide`,
  `_shared/markdown-to-pdf.ts`), Logo/Markenfarbe, Fußzeile mit Seitenzahl.
- Admin-Bereich: Leitfaden-Textbausteine, Scoring-Rulesets, **Nutzerübersicht**
  (`admin-list-users` — nur Account-Stammdaten, bewusst keine Gesundheitsdaten).
- DSGVO-Self-Service: Datenexport (`export-data`), Konto-Löschung mit
  14-Tage-Widerrufsfrist, automatische Löschung inaktiver Accounts
  (`purge-expired-accounts`, täglicher Cron).
- UX-Politur: Lade-Spinner, Fokus-Ringe auf Custom-Radios, Lösch-
  Bestätigungen, Leerzustände, kontextbewusstes Start/Fortsetzen.
- Hosting: Azure Static Web Apps, GitHub Actions CI/CD (`main`-Push →
  Auto-Deploy), `environment.prod.ts` korrekt auf das echte Supabase-
  Projekt gesetzt.

## Gutachter-Formular (Profi-Modus) — fertig, ungetestet in echtem Browser

Vom Auftraggeber per `documents/attachments/neu.xlsx` bestätigt: das
vollständige offizielle "Formulargutachten zur Feststellung der
Pflegebedürftigkeit (Erwachsene)". Details zur Architektur-Entscheidung
siehe `~/.claude/plans/stateful-humming-flask.md` (Abschnitt "Block:
Gutachter-Formular"). Alle 8 Umsetzungsschritte sind implementiert:

- [x] Migration: `assessments.kind/subject_name/subject_birthdate`,
      `profiles.role` um `'gutachter'` erweitert, Tabellen
      `assessment_admin_data` + `assessment_chapters` (RLS via
      `owns_assessment`, kein neues Berechtigungsmodell nötig).
- [x] `basePath`-Refactor der Modul-1–6-/Summary-Komponenten.
- [x] `/gutachten`-Grundgerüst: `gutachterGuard`, Routen, Nav-Eintrag,
      `gutachten-home`-Liste, Stammdaten-Schritt.
- [x] Kapitel 1–3 (Vorgeschichte, Befund, Diagnosen).
- [x] Kapitel 6 (außerhäusliche Aktivitäten, Haushaltsführung — reused
      `LevelQuestionGroupComponent`/`INDEPENDENCE_SCALE`).
- [x] Kapitel 7 (Förderung/Reha-Empfehlungen).
- [x] Kapitel 8–9 (weitere Empfehlungen, Prognose) — Kap. 9 setzt
      `current_step='fertig'` und landet auf der (wiederverwendeten)
      Ergebnis-Seite.
- [x] PDF-Export: `generate-gutachten-pdf` Edge Function (deployed),
      rendert Stammdaten + alle Kapitel über `_shared/markdown-to-pdf.ts`,
      Ergebnis-Seite zeigt bei `kind='gutachten'` einen eigenen
      "Gutachten-PDF erstellen"-Block statt des Leitfaden-Textes.

Flow: Gutachten anlegen → Stammdaten → Kap. 1 → Kap. 2 → Kap. 3 →
Modul 1–6 (wiederverwendet) → Zusammenfassung/Berechnung → Kap. 6 → Kap. 7
→ Kap. 8 → Kap. 9 → Ergebnis-Seite mit PDF-Download.

**Echter Praxistest durch den Auftraggeber (2026-10-20) — 8 gemeldete Punkte, alle behoben:**
- [x] **Datenverlust beim Reiter-Wechsel** (Modul 5 zurückgesetzt, Diagnosen
      nicht gespeichert): Ursache war fehlendes Autosave — Werte wurden nur
      beim expliziten "Weiter"-Klick persistiert. Jetzt debounced Autosave
      (`autosaveOnChange`, 800ms) in allen 14 Gutachten-Schritten + 6
      wiederverwendeten Modul-Komponenten, über einen eigenen
      `autosaveModuleAnswers()`-Service-Pfad, der (anders als
      `saveModuleAnswers()`) `assessments.current_step` nicht mit anfasst.
- [x] Nach Berechnung sprang es bei Gutachten direkt zu Kap. 6 statt das
      Ergebnis zu zeigen → Ergebnis-Seite wird jetzt immer zuerst gezeigt,
      mit neuen Buttons "Module bearbeiten" / "Weiter zu Kapitel 6".
- [x] Nach "Weiter" landete die nächste Seite am unteren Scroll-Rand →
      `withInMemoryScrolling({scrollPositionRestoration:'enabled'})`.
- [x] Summenwerte (Gesamtpunktwert/Pflegegrad) werden jetzt zusätzlich unter
      der Modul-Punkte-Übersicht wiederholt (Gewohnheit des Auftraggebers).
- [x] Medikamente-Eingabe in Modul 5 ergänzt (Name/Dosierung/Häufigkeit,
      Liste wie Pflegepersonen/Diagnosen) — fließt nicht in die
      Punkteberechnung ein, reine Dokumentation fürs Handout/PDF.
- [x] Schriftgröße für primär ältere Zielgruppe vergrößert — Root-Font-Size
      global auf 112.5% (18px statt 16px), skaliert alle rem-basierten
      Tailwind-Textgrößen proportional mit.

**Noch zu tun:**
- [ ] `ng test` (Unit-Tests) existieren für die neuen Komponenten noch nicht.
- [ ] Vereinfachungen gegenüber dem echten Formular bewusst in Kauf
      genommen (z. B. Kap. 7 auf 3 statt 6 Unterfelder je Domäne verdichtet,
      Pflegepersonen/Diagnosen als einfache Listen statt fixer Slot-Anzahl)
      — bei Bedarf mit dem Auftraggeber abgleichen, ob das für den
      Praxiseinsatz reicht.

**Explizit nicht Teil dieses Blocks:** ICD-10/Rote-Liste-Integration,
Shop/Payment, Marketing, Assistent/RAG, Formulare-Bibliothek,
Barrierefrei-Audit — siehe Backlog unten.

## Backlog (aus der Mindmap des Auftraggebers, noch nicht eingeplant)

- [ ] **Shop/Payment**: Preismodell (€99 einmalig, Mengenrabatte),
      Zahlungsanbieter (PayPal/Kreditkarte/Klarna), Paywall ("erst
      bezahlen, dann nutzen"), Anti-Manipulations-Sperre bei signifikanten
      nachträglichen Änderungen am Gutachten (braucht Änderungs-
      Historie/Diff-Erkennung). Eigener Block, andere Art von Arbeit
      (Zahlungsanbieter-Integration, rechtliche Fragen).
- [ ] **Assistent/RAG-Chat**: war schon als "Phase 7" der ursprünglichen
      Roadmap vorgesehen. `pgvector`/`document_embeddings` sind in der DB
      schon vorbereitet, aber nichts gebaut.
- [ ] **Formulare-Bibliothek**: Antrag auf Einstufung/Höherstufung,
      Widerspruchsschreiben (Pflegegrad + Hilfsmittel), Antrag auf
      Hilfsmittel — als ausfüllbare/generierbare Vorlagen im Tool. Konkreter
      Flow laut `documents/attachments/2026_10_20/
      2026_10_19_Antrag_Einstufung_Höherstufung.docx` (Visio-Flowchart):
      Login → Antrag auswählen → Einstufung/Höherstufung wählen → Angaben
      prüfen (aus Registrierung vorausgefüllt) → online versenden oder
      drucken/faxen.
- [ ] **Optionaler Passkey-Login**: laut `documents/attachments/2026_10_20/
      2026_10_19_Anmeldung_Registrierung_Online.docx` als Alternative zu
      Benutzername+Passwort im Registrierungs-Flow gewünscht ("evtl.
      Passkey"). Bestätigt sonst nur den bestehenden Auth-Flow 1:1.
- [ ] **Interface-Erweiterungen**: ICD-10-Schlüssel-Lookup, Rote-Liste-
      Integration (Medikamenten-Datenbank), Sprachsteuerung.
- [ ] **Barrierefrei-Audit**: formaler WCAG-2.1-AA-Check (bisher nur
      punktuelle Fixes wie Fokus-Ringe, kein vollständiger Audit).
- [ ] **Zusatzthemen**: Anwalts-Vermittlung, Hilfsmittelversorgung-
      Vermittlung — vermutlich Marktplatz-/Vermittlungsfunktion.
- [ ] Marketing (Video, Storytelling, PR) — kein Entwicklungsthema,
      höchstens Tracking/Share-Hooks falls später gewünscht.

## Offene Compliance-/Betriebspunkte (nicht blockierend für Code, aber vor echtem Nutzer-Traffic klären)

- [ ] **Welches Supabase-Projekt ist "Produktion"?** `environment.prod.ts`
      zeigt aktuell auf dasselbe Projekt wie `environment.ts` (im Code-
      Kommentar als "Dev-Stage" bezeichnet). Klären, ob ein separates
      Prod-Projekt aufgesetzt werden soll, bevor echte Nutzerdaten reinkommen.
- [ ] **AV-Scanner tatsächlich deployed?** `infra/av-scanner` muss auf
      einer eigenen EU-VM laufen, damit Uploads funktionieren — Status
      prüfen.
- [ ] Kein Reminder-E-Mail vor automatischer Löschung inaktiver Accounts
      (kein E-Mail-Anbieter ausgewählt).
- [ ] VVT (Verzeichnis von Verarbeitungstätigkeiten) und Datenschutz-
      erklärung noch nicht geschrieben — inkl. Microsoft/Azure als neuer
      Auftragsverarbeiter seit dem Hosting-Wechsel, und Admin-Zugriff auf
      Account-Stammdaten (`admin-list-users`).
- [ ] Rechtliche/fachliche Prüfung der Leitfaden-Textbausteine vor Launch.
- [ ] Cookie-Consent/Analytics (Tool ja/nein).
- [ ] Mehrsprachigkeit (aktuell nur Deutsch).
