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

- [ ] **Shop/Payment** — Preismodell (€99 einmalig + Mengenrabatte +
      Sozialgerichtsbarkeit-Sondertarif €1/Jahr), Zahlungsanbieter
      (PayPal/Kreditkarte/Klarna), Paywall, Manipulationsschutz.
- [ ] **Interface-Erweiterungen** — ICD-10-Schlüssel-Lookup, Rote-Liste-
      Integration (Medikamenten-Datenbank), Sprachsteuerung.
- [ ] **Assistent/RAG-Chat** — `pgvector`/`document_embeddings` sind
      vorbereitet, Ingestion der BRi-PDFs + Rückfragen-Chat fehlt.
- [ ] **Optionaler Passkey-Login** — WebAuthn als Alternative zu
      Benutzername+Passwort (vom Kunden nur als "evtl." markiert).
- [ ] **Zusatzthemen: Vermittlungs-Marktplatz** — Anwalts-Vermittlung,
      Hilfsmittelversorgung-Vermittlung.

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
