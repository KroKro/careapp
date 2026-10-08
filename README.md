# careapp — Pflegegrad-Selbsteinschätzung

Architektur-Hintergrund: siehe `~/.claude/plans/stateful-humming-flask.md` (Angular +
Supabase Cloud, EU-Region Frankfurt). Fachlicher Hintergrund (Berechnungslogik nach
§ 15 SGB XI) in `supabase/functions/_shared/scoring.ts`, verifiziert gegen
`documents/attachments/2016_11_Begutachtungsmodul_Pflegegrade.xltx` und die
BRi-Richtlinien-PDFs im selben Ordner.

## Stand (Phase 1-6)

- `apps/web`: Angular-App (Standalone Components/Signals). Auth-Flow, der komplette
  6-Modul-Berechnungs-Wizard, Ergebnis-Anzeige mit Leitfaden+PDF-Download,
  Dokumenten-Upload, ein rollenbasierter Admin-Bereich (`/admin`, nur `role=admin`)
  und DSGVO-Self-Service (Datenexport, Konto-Löschung mit Widerrufsfrist) im
  Konto-Bereich sind funktionsfähig, sobald echte Supabase-Zugangsdaten
  eingetragen sind. Nur die RAG-Erweiterung (Phase 7) ist noch offen.
- `supabase/migrations`: Schema inkl. RLS für alle Tabellen, private Storage-Buckets
  `documents` (15 MB, PDF/JPEG/PNG) und `guides` (5 MB, nur PDF) mit Owner-Policies.
- `supabase/seed.sql`: aktives `scoring_rulesets`-Datenset ("BRi-2026") sowie die
  `guide_templates`-Textbausteine (allgemein pro Pflegegrad + pro Modul/Schweregrad).
- `supabase/functions/_shared/scoring.ts` (+ Tests): die Pflegegrad-Berechnung,
  verifiziert gegen die Excel-Vorlage/BRi (`deno test`, 15/15 grün).
- `supabase/functions/calculate-pflegegrad`: verdrahtet die Berechnung mit der DB.
- `supabase/functions/scan-document`: lädt eine hochgeladene Datei serverseitig,
  prüft Magic Bytes gegen den deklarierten MIME-Type und lässt sie durch den
  AV-Scanner aus `infra/av-scanner` prüfen (clean/infected/rejected).
- `supabase/functions/generate-guide`: setzt aus `guide_templates` + Ergebnis einen
  regelbasierten Leitfaden zusammen (kein LLM) und rendert ihn serverseitig als PDF
  (`_shared/markdown-to-pdf.ts`) in den privaten Bucket `guides`.
- `infra/av-scanner`: selbst betriebener ClamAV-Dienst (Docker Compose) + Deno-
  HTTP-Wrapper — bewusst kein Cloud-AV-API-Drittanbieter für Gesundheitsdokumente.
  Muss separat auf einer eigenen EU-VM deployt werden (siehe `infra/av-scanner/README.md`).
- `supabase/functions/export-data`: Art.-20-Datenexport als ZIP (Profil, Assessments,
  Ergebnisse, Leitfäden+PDFs, Dokumente) — läuft bewusst nur mit dem Nutzer-JWT
  (keine Service-Role nötig, RLS reicht für den Lesezugriff auf eigene Daten).
- `supabase/functions/purge-expired-accounts`: täglich per Cron aufzurufende Function
  (Art. 17 DSGVO) — merkt inaktive Accounts (>24 Monate ohne Login) automatisch zur
  Löschung vor und löscht Accounts endgültig, deren 14-tägige Widerrufsfrist
  (`profiles.deletion_requested_at`, im Konto-Bereich selbst setz-/abbrechbar)
  abgelaufen ist. Läuft mit Service-Role + eigenem Secret (kein User-Login).

## Setup

### Voraussetzungen
- Node.js 20+, npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- [Deno](https://deno.com) (`brew install deno`) — für Edge-Function-Tests
- Docker (für lokale Supabase-Entwicklung mit `supabase start`) — **aktuell auf
  dieser Maschine nicht installiert**, siehe unten.

### 1. Supabase-Cloud-Projekt anlegen
1. Projekt auf https://supabase.com/dashboard anlegen, Region **Frankfurt (eu-central-1)**.
2. `supabase link --project-ref <project-ref>` im Repo-Root.
3. `supabase db push` — spielt `supabase/migrations/` ein.
4. Seed einspielen: Inhalt von `supabase/seed.sql` im SQL-Editor des Dashboards
   ausführen (oder `psql` gegen die Connection-String aus den Projekteinstellungen).
5. Edge Functions deployen:
   `supabase functions deploy calculate-pflegegrad scan-document generate-guide export-data purge-expired-accounts`.
6. AV-Scanner gemäß `infra/av-scanner/README.md` auf einer eigenen EU-VM deployen,
   dann `supabase secrets set AV_SCANNER_URL=... AV_SCANNER_SECRET=...`.
7. Secret für `purge-expired-accounts` setzen (beliebiger zufälliger String, z. B.
   `openssl rand -hex 32`): `supabase secrets set INTERNAL_CRON_SECRET=...`.
8. **Täglichen Cron-Lauf manuell einrichten** (geht nicht per Migration, da die
   Functions-URL erst nach dem Deploy feststeht) — im SQL-Editor des Dashboards:
   ```sql
   select cron.schedule(
     'purge-expired-accounts-daily',
     '0 3 * * *',
     $$
     select net.http_post(
       url := 'https://<project-ref>.functions.supabase.co/purge-expired-accounts',
       headers := jsonb_build_object('X-Internal-Secret', '<dasselbe Secret wie INTERNAL_CRON_SECRET>'),
       body := '{}'::jsonb
     );
     $$
   );
   ```
9. In den Projekteinstellungen (Settings → API) `Project URL` und `anon public`-Key
   kopieren und in `apps/web/src/environments/environment.prod.ts` eintragen
   (niemals den `service_role`-Key ins Frontend!).

### 2. Lokale Entwicklung
```bash
npm install --workspace=web
cd apps/web && npm start   # http://localhost:4200
```
Für lokale Supabase-Entwicklung (`supabase start`) wird Docker benötigt — ist auf
dieser Maschine noch nicht installiert. Bis dahin gegen das Cloud-Projekt entwickeln
und `environment.ts` entsprechend auf die Cloud-Werte zeigen lassen (nicht committen,
falls es echte Keys enthält — besser eine lokale, nicht versionierte Kopie pflegen).

### 3. Tests
```bash
cd supabase && deno test --node-modules-dir=none --allow-env --allow-net --allow-read --allow-write functions/_shared
cd apps/web && npx ng test
```
Wichtig: Deno-Tests müssen mit `cwd=supabase` laufen (oder `npm run supabase:test`
vom Repo-Root). Von einer übergeordneten Ebene aus erkennt Deno das npm-Workspace
des Angular-Frontends und lädt dessen komplette, unzusammenhängende Dependency-
Graph mit — `--node-modules-dir=none` plus `supabase/deno.json` verhindert das nur,
wenn `supabase/` auch tatsächlich das Arbeitsverzeichnis ist.

## Nächste Schritte (siehe Plan, Phase 7)
7. RAG-Erweiterung (`document_embeddings`, pgvector ist in der Migration bereits aktiviert).

## Offener Punkt: Erinnerungs-E-Mail vor Inaktivitäts-Löschung
`purge-expired-accounts` merkt inaktive Accounts (>24 Monate) automatisch zur Löschung
vor, verschickt aber noch **keine** Erinnerungs-E-Mail davor — dafür ist noch kein
E-Mail-Anbieter ausgewählt (siehe offene Punkte im Architektur-Plan). Vor
Produktivbetrieb nachrüsten, sonst werden inaktive Nutzer ohne Vorwarnung gelöscht.
