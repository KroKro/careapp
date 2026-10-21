# TODO — bis der Auftraggeber zufrieden ist

Abhak-Liste für die offenen Bau-Aufgaben aus `brain.md`. Reihenfolge nach
Aufwand/Nähe zu bereits Gebautem, nicht nach Wichtigkeit — bei Bedarf
umsortieren. Haken setzen, sobald etwas live getestet (nicht nur
`ng build`) und deployed ist.

## Tier 1 — klein, gleiches Muster wie bereits gebaute Anträge ✅ fertig

- [x] **Antrag auf Hilfsmittel** — `care_level_applications.antragsart`
      um `'hilfsmittel'` erweitert, eigenes Feld "Gewünschtes Hilfsmittel",
      gleiche UI/PDF wie Einstufung/Höherstufung. Deployed, per Playwright
      verifiziert.
- [x] **Widerspruchsschreiben bei Pflegegraden** — neues Feature
      `/widersprueche`, Tabelle `objection_letters`, Edge Function
      `generate-widerspruch-pdf`, eigener Nav-Eintrag + Dashboard-Karte.
      Deployed, per Playwright verifiziert.
- [x] **Widerspruchsschreiben bei Hilfsmitteln** — gleiches Feature wie
      oben, zweite `widerspruchsart`. Deployed, per Playwright verifiziert.
- [x] **Widerspruch als mehrstufiger Vorgang** (2026-10-21, aus
      `2026_10_20_Prozessbeschreibung_Widerspruch.docx`): Verknüpfung mit
      eigener Einschätzung/Gutachten (zieht Diagnosen + Medikamente
      automatisch in die PDF), Protokoll-des-Begutachtungstermins-Feld,
      Status-Tracking (Entwurf → versendet → Bescheid angefordert/
      erhalten → abgeschlossen oder Klageverfahren) mit Statusbadges in
      der Übersicht. Deployed, End-to-End inkl. PDF-Inhalt per Playwright
      verifiziert (Diagnosen/Medikamente/Protokoll tatsächlich im PDF-Text
      bestätigt, nicht nur "kein Fehler"). Details in `brain.md`.
- [x] **Leitfaden-Inhalt erweitern** — `generate-guide` um "Merksätze für
      die Begutachtung" und "Zusammenfassung der wichtigsten Unterlagen"
      (Checkliste) ergänzt, statisch (nicht pflegegradabhängig). Bewusst
      hart codiert statt `guide_templates`-Zeile, da die Admin-UI für
      Textbausteine aktuell immer einen konkreten Pflegegrad voraussetzt.
      Deployed, Inhalt im generierten Leitfaden per Playwright bestätigt.

## Tier 2 — neuer Bereich aus dem Mindmap-Ast "Seiten" ✅ fertig

- [x] **Downloads-Bereich** (`/downloads`) — offizielle BRi (als
      statisches PDF-Asset, `public/dokumente/`) + Link zum amtlichen
      SGB-XI-Gesetzestext (gesetze-im-internet.de, verifiziert), plus
      Liste der eigenen erstellten Leitfäden/Formulargutachten mit
      Download-Button. Bewusst "Downloads" statt "Dokumente" genannt, um
      nicht mit dem bestehenden Dokumenten-Upload-Bereich zu kollidieren.
      Nebenbei einen echten Produktions-Bug gefunden: Azure-SWA-Routing
      hatte `.pdf` nicht von der SPA-Fallback-Regel ausgenommen — wäre in
      Produktion kaputt gewesen, jetzt in `staticwebapp.config.json`
      gefixt.
- [x] **Informationen-Bereich** (`/informationen`) — Erklärtexte zu
      Begutachtungen (6-Module-Prinzip erklärt) und Hilfsmittel
      (Pflegekasse vs. Krankenkasse), mit Links zu den jeweiligen
      Funktionen im Tool. "Anmelden/Registrieren" als Thema bewusst
      weggelassen — ergibt hinter dem Login keinen Sinn (Feedback vom
      Auftraggeber). Falls als Vor-Registrierungs-Seite gewünscht,
      bräuchte das ein eigenes öffentliches Layout, siehe `brain.md`.

## Tier 3 — Barrierefrei ✅ fertig (v1, siehe Hinweise in brain.md)

- [x] **Plain-Language-Modus** (`PlainLanguageService`, Toggle "Aa" im
      Header) — größere Schrift, mehr Zeilenabstand, schmalere Textspalte
      für bessere Lesbarkeit; vereinfachte Dashboard-Begrüßung. Bewusst
      **keine** automatische Umformulierung der offiziellen
      BRi-Kriterien/Fragetexte (Risiko, die Begutachtungskriterien
      inhaltlich zu verfälschen) — nur Typografie + unkritische UI-Texte.
- [x] **Assistenzfunktionen** — Vorlesen-Funktion (`TextToSpeechService`,
      Web Speech API, `de-DE`) auf Informationen-Seite und beim
      persönlichen Leitfaden; `ReadAloudButtonComponent` wiederverwendbar.
      Kurzer Accessibility-Audit über alle Templates (Icon-only-Buttons
      ohne `aria-label`) ergab einen echten Treffer: mobiles
      Hamburger-Menü ohne Label — gefixt. Kein vollständiger formaler
      WCAG-2.1-AA-Audit (das bleibt ein größerer, eigener Posten).

## Tier 4 — größere, eigenständige Blöcke

**Pausiert (2026-10-21):** Auftraggeber bespricht Tier 4 erst intern,
bevor hier weitergebaut wird.

- [ ] **ICD-10-Schlüssel-Lookup** — frei verfügbare Daten (DIMDI/BfArM),
      baubar ohne externe Verträge. **Nächster sinnvoller Schritt.**
- [ ] **Sprachsteuerung** (Formulare per Sprache ausfüllen) —
      Web-Speech-API, baubar ohne externe Verträge.
- [x] ~~Optionaler Passkey-Login~~ — **blockiert, nicht unser Bug**: Code
      ist fertig (Login-Button, Konto-Verwaltung, native Supabase-API
      `signInWithPasskey`/`registerPasskey`/`passkey.*`), aber Supabase
      schaltet es serverseitig nicht frei (`passkeys_enabled: false`
      trotz korrekter Config) — sieht nach Plan-/Billing-Sperre aus, muss
      im Supabase-Dashboard geklärt werden. Code-Änderungen wurden auf
      Wunsch des Auftraggebers wieder zurückgesetzt. Details in `brain.md`.
- [ ] **Rote-Liste-Integration** — **nicht baubar ohne Lizenz**: die Rote
      Liste ist eine kommerzielle, lizenzpflichtige Medikamenten-
      Datenbank. Erst möglich, wenn eine Lizenz vorliegt.
- [ ] **Assistent/RAG-Chat** — `pgvector`/`document_embeddings` sind
      vorbereitet. Präzisiert (2026-10-21): Embeddings/Dokumentensuche
      laufen komplett in Supabase selbst (natives `gte-small`-Modell in
      Edge Functions, kein Drittanbieter nötig). Nur die eigentliche
      Chat-Antwort (LLM) braucht noch eine Entscheidung — Auftraggeber
      tendiert zu **selbst gehostetem LLM** (Ollama/Llamafile auf eigener
      VM, nach demselben Muster wie `infra/av-scanner`) statt externer
      API, um den AV-Vertrag zu vermeiden. Offene Frage dabei: CPU- vs.
      GPU-Server (Kosten-/Qualitätsabwägung, Auftraggeber entscheidet).
- [ ] **Zusatzthemen: Vermittlungs-Marktplatz** — Anwalts-Vermittlung,
      Hilfsmittelversorgung-Vermittlung — blockiert bis echte Partner
      feststehen, sonst nur eine leere Hülle.
- [ ] **Shop/Payment** — bewusst zuletzt (Wunsch des Auftraggebers).
      Preismodell (€99 einmalig + Mengenrabatte + Sozialgerichtsbarkeit-
      Sondertarif €1/Jahr), Zahlungsanbieter (PayPal/Kreditkarte/Klarna),
      Paywall, Manipulationsschutz — braucht echte Zahlungsanbieter-
      Zugangsdaten.

**Außerhalb dieser Liste, aber offen:** ein unkommitteter Fix in
`supabase/config.toml` (MFA-TOTP + E-Mail-OTP-Werte wiederhergestellt,
nachdem ein `config push` sie versehentlich überschrieben hatte) — beim
nächsten Git-Commit mitnehmen, sonst überschreibt der nächste
`config push` sie wieder.

## Nicht auf dieser Liste (kein Bau-Thema)

- Marketing (Video, Storytelling, PR) — kein Entwicklungsthema.
- Compliance-/Betriebspunkte (VVT, Datenschutzerklärung, Prod/Dev-
  Trennung, AV-Scanner-Status, E-Mail-Anbieter) — siehe `brain.md`,
  Abschnitt "Offene Compliance-/Betriebspunkte". Organisatorisch/
  rechtlich, läuft parallel, nicht hier abgehakt.

---

Quelle/Hintergrund zu jedem Punkt: `brain.md`. Diese Datei hier ist nur
die Kurzfassung zum Abhaken; Details, Entscheidungen und Begründungen
bleiben in `brain.md` gepflegt.
