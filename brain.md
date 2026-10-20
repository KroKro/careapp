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
- **Rollenbewusstes Dashboard** (2026-10-20, Reaktion auf Feedback "Menschen
  verstehen nicht, was sie überhaupt machen können"): neue Startseite `/`
  (`features/dashboard`) ersetzt den bisherigen direkten Sprung zu
  `/assessment`. Zeigt eine Begrüßung + Rollen-Badge ("Angemeldet als
  Bürger:in/Gutachter:in/Admin") und eine Karten-Übersicht aller für die
  jeweilige Rolle verfügbaren Bereiche (Selbsteinschätzung, Dokumente,
  Anträge, Konto, + Gutachten für Gutachter/Admin, + Admin-Bereich nur für
  Admin) mit Status ("3 Einschätzungen angelegt" etc.) und direktem CTA.
  Sidebar neu in Abschnitte gruppiert ("Meine Pflege" / "Profi-Werkzeuge" /
  "Verwaltung"), Rollen-Badge zusätzlich im Header neben der E-Mail.
  `AuthService.ensureRole()` behebt dabei eine Race Condition (Rolle wurde
  teils noch nicht geladen, wenn eine Komponente `role()` direkt beim Init
  liest — betraf nur das neue Dashboard, die Supabase-RLS-Guards für
  `/admin`/`/gutachten` holen die Rolle ohnehin unabhängig selbst).

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
- [x] **Antrag auf Einstufung/Höherstufung** (2026-10-20 gebaut, erster Teil
      der „Formulare-Bibliothek"): neue Route `/antraege`, Tabelle
      `care_level_applications` (RLS: `user_id = auth.uid()`, Datensparsamkeit
      bleibt gewahrt — keine Erweiterung von `profiles`), Edge Function
      `generate-antrag-pdf` (deployed) rendert PDF über
      `_shared/markdown-to-pdf.ts`, Nav-Eintrag „Anträge" für alle Rollen.
      Flow 1:1 aus `documents/attachments/2026_10_20/
      2026_10_19_Antrag_Einstufung_Höherstufung.docx`: Antragsart wählen →
      Angaben prüfen/korrigieren (autosave) → PDF erstellen. Da es noch
      keinen echten elektronischen Übermittlungsweg an Pflegekassen gibt,
      ist das PDF bewusst der einzige Ausgang für sowohl „online versenden"
      (als E-Mail-Anhang) als auch „drucken/faxen" — kein Fake-Submit.
- [x] **Antrag auf Hilfsmittel** (2026-10-20): `care_level_applications
      .antragsart` um `'hilfsmittel'` erweitert (gleiche Tabelle/UI wie
      Einstufung/Höherstufung, da Stammdaten-Felder identisch sind),
      zusätzliches Feld `hilfsmittel_bezeichnung`.
- [x] **Widerspruchsschreiben bei Pflegegraden + Hilfsmitteln** (2026-10-20):
      eigenes, kleines Feature `/widersprueche` (nicht in
      `care_level_applications` integriert, da inhaltlich ein anderer
      Dokumenttyp — Bezug auf Bescheiddatum/Aktenzeichen + Begründung statt
      reiner Antragsdaten). Tabelle `objection_letters`, Edge Function
      `generate-widerspruch-pdf`, eigener Nav-Eintrag (Waage-Icon) +
      Dashboard-Karte. Hinweis im UI auf die gesetzliche
      Widerspruchsfrist (i. d. R. 1 Monat ab Bescheidzugang).
- [x] **Leitfaden-Inhalt erweitert** (2026-10-20): `generate-guide` um
      zwei statische Abschnitte ergänzt — "Merksätze für die
      Begutachtung" (Verhaltenstipps für den MD-Termin) und
      "Zusammenfassung der wichtigsten Unterlagen" (Mitbring-Checkliste),
      laut Mindmap-Ast "Handout". Bewusst hart codiert in der Edge
      Function statt als `guide_templates`-Zeile: die bestehende Admin-UI
      für Textbausteine erzwingt bei "general"-Einträgen immer einen
      konkreten Pflegegrad (0–5), es gibt keinen "gilt für alle"-Fall —
      für zwei statische, pflegegradunabhängige Blöcke wäre eine
      UI-Erweiterung unverhältnismäßig gewesen.
- [ ] **Optionaler Passkey-Login**: laut `documents/attachments/2026_10_20/
      2026_10_19_Anmeldung_Registrierung_Online.docx` als Alternative zu
      Benutzername+Passwort im Registrierungs-Flow gewünscht ("evtl.
      Passkey"). Bestätigt sonst nur den bestehenden Auth-Flow 1:1.
- [ ] **Interface-Erweiterungen**: ICD-10-Schlüssel-Lookup, Rote-Liste-
      Integration (Medikamenten-Datenbank), Sprachsteuerung.
- [x] **Barrierefrei — v1 gebaut** (2026-10-20), zwei Teilpunkte laut
      Mindmap:
      - **Verständliche Formulierungen**: `PlainLanguageService` +
        Header-Toggle "Aa", persistiert in `localStorage`. Bewusst nur
        Typografie (größere Schrift, mehr Zeilenabstand, `.plain-language
        .card { space-y-5 }`, schmalere Textspalte `max-width: 65ch`)
        plus eine vereinfachte Dashboard-Begrüßung — **keine**
        automatische Umformulierung der eigentlichen BRi-Kriterien/
        Fragetexte im Wizard. Bewusste Entscheidung: die Begutachtungs-
        Fragen sind wörtlich aus der BRi zitiert: Faustformel: alles,
        was unmittelbar in die Pflegegrad-Berechnung einfließt oder den
        Antworttext selbst betrifft, bleibt unverändert, nur Layout drum
        herum passt sich an.
      - **Assistenzfunktionen**: `TextToSpeechService` (Web Speech API,
        `de-DE`) + wiederverwendbare `ReadAloudButtonComponent`, auf der
        Informationen-Seite und beim persönlichen Leitfaden eingebaut.
        Zusätzlich ein kurzer Codebase-Audit auf Icon-only-Buttons ohne
        `aria-label` — ein echter Treffer gefunden und gefixt (mobiles
        Hamburger-Menü in `app-shell`). Kein vollständiger formaler
        WCAG-2.1-AA-Audit (bleibt eigener, größerer Posten, siehe oben
        "Explizit nicht Teil dieses Blocks").
- [x] **Leitfaden/Handout inhaltlich erweitert** (2026-10-20): Mindmap
      nennt unter "Handout" vier Teile — "Zusammenfassung der wichtigsten
      Unterlagen" (✅ jetzt in `generate-guide`), "Übersicht Diagnosen +
      Medikamente" (✅ gebaut, Kap. 3/Modul 5), "Merksätze für die
      Begutachtung" (✅ jetzt in `generate-guide`) und das vollständige
      Formulargutachten (✅ gebaut). Alle vier Teile jetzt vorhanden.
- [x] **Bereich "Seiten" aus der Mindmap** (2026-10-20 gebaut): ein eigener
      Mindmap-Ast (nicht zu verwechseln mit dem "Dokumente"-Ast mit den
      SGB-Paragraphen) beschreibt eine Art Sitemap für drei Bereiche:
      - **Informationen** → Anmelden/Registrieren, Begutachtungen,
        Hilfsmittel. ✅ Gebaut als `/informationen` — bewusst innerhalb
        des Login-Bereichs (gleiche Nav/Dashboard-Integration wie überall
        sonst), nicht als separate öffentliche Marketing-Seite für
        nicht angemeldete Besucher:innen. **Anmelden/Registrieren als
        Thema wieder entfernt** (Feedback Auftraggeber 2026-10-20: ergibt
        hinter dem Login keinen Sinn, da man sich dort schon angemeldet
        hat) — Bereich zeigt jetzt nur noch Begutachtungen + Hilfsmittel.
        **Offene Produktentscheidung**: falls der Auftraggeber
        Anmelden/Registrieren-Infos als echte Vor-Registrierungs-Seite
        für unentschlossene Erstbesucher:innen will, bräuchte das ein
        eigenes öffentliches Layout außerhalb des `authGuard` — bewusst
        nicht selbst entschieden, das ist ein Marketing-/Produkt-Scope,
        kein technischer Zwang.
      - **Antrag** → Begutachtung, Hilfsmittel, Widerspruchsschreiben
        (✅ alle drei durch `/antraege` bzw. `/widersprueche` abgedeckt —
        fehlt nur noch ein gemeinsamer "Antrag"-Hub, falls gewünscht;
        aktuell zwei getrennte Bereiche).
      - **Dokumente mit Download** → Gesetzestexte, Begutachtungs-
        richtlinien (BRi), Handout/Leitfaden, Formulargutachten aus
        eigener Erstellung. ✅ Gebaut als `/downloads`: BRi als
        statisches PDF (`public/dokumente/`), SGB-XI-Gesetzestext als
        verifizierter externer Link zu gesetze-im-internet.de (amtliche
        Quelle des Bundesministeriums der Justiz — bewusst kein eigener
        Download, um keine eigene, potenziell veraltete Gesetzeskopie zu
        pflegen), plus Liste der eigenen erstellten Leitfäden/
        Formulargutachten. Dabei einen echten Produktions-Bug gefunden:
        `staticwebapp.config.json` hatte `.pdf` nicht von der
        SPA-Fallback-Regel ausgenommen — PDF-Downloads wären auf Azure
        Static Web Apps fehlgeschlagen (lokal in `ng serve` nicht
        sichtbar). Gefixt.
- [ ] **Preismodell für Sozialgerichtsbarkeit bestätigt**: unter "Preis"
      steht neben den Bürger:innen-Tarifen (€99 einmalig usw.) ein
      eigener Eintrag **"für die Sozialgerichtsbarkeit € 1,00 im Jahr"**
      — ein separates, deutlich günstigeres Lizenzmodell für die
      Zielgruppe Sozialgerichte/Anwälte (passend zu "Fachinstrument für
      die Sozialgerichtsbarkeit" unter Merkmale). Gehört mit zum
      Shop/Payment-Block, aber eigene Preislogik/Rolle nötig.
- [ ] **Zusatzthemen**: Anwalts-Vermittlung, Hilfsmittelversorgung-
      Vermittlung — vermutlich Marktplatz-/Vermittlungsfunktion.
- [ ] Marketing (Video, Storytelling, PR) — kein Entwicklungsthema,
      höchstens Tracking/Share-Hooks falls später gewünscht.

**Methodik-Notiz (2026-10-20):** Ein erster Versuch, Details aus den
Rohdaten (`Contents.data`) von `2026_10_19_Begutachtung.mindnode`
herauszulesen, wurde zunächst fälschlich für falsch gehalten und wieder
zurückgenommen, nachdem ein Mindmap-Screenshot keine dieser Details
zeigte — der Auftraggeber hat danach klargestellt, dass jener Screenshot
versehentlich die alte Mindmap war. Ein zweiter, korrekter Screenshot der
aktuellen Mindmap bestätigt: **die ursprünglich extrahierten Rohdaten-
Funde waren tatsächlich korrekt**, inklusive der Preisangabe "€ 1,00 im
Jahr". Alle Backlog-Punkte oben spiegeln jetzt den per Screenshot
bestätigten, aktuellen Mindmap-Stand wider.

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
