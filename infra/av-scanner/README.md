# AV-Scanner

Minimaler, selbst betriebener Virus-Scan-Dienst für Nutzer-Uploads
(Arztberichte, Gutachten, Atteste). Bewusst **kein** Cloud-AV-API-Drittanbieter
(z. B. VirusTotal/Cloudmersive), damit rohe Gesundheitsdokumente keinen
weiteren externen Auftragsverarbeiter durchlaufen — siehe Architektur-Plan,
Abschnitt 7.

Besteht aus zwei Containern:
- `clamav`: offizielles ClamAV-Image (clamd-Daemon, Virendefinitionen).
- `scanner-api`: dünner Deno-HTTP-Wrapper (`POST /scan`), der Datei-Bytes per
  INSTREAM-Protokoll an clamd weiterreicht und `{ clean, signature }` zurückgibt.

## Deployment (z. B. Hetzner CX22, Nürnberg/Falkenstein)

1. Docker + Docker Compose auf der VM installieren.
2. Dieses Verzeichnis auf die VM kopieren.
3. `.env` mit einem zufälligen Secret anlegen:
   ```bash
   echo "SCANNER_SHARED_SECRET=$(openssl rand -hex 32)" > .env
   ```
4. `docker compose up -d`
5. **TLS + Zugriffsschutz**: `scanner-api` spricht nur HTTP ohne eigene TLS-
   Terminierung. Vor Produktivbetrieb einen Reverse Proxy (z. B. Caddy oder
   nginx) mit TLS-Zertifikat davorsetzen und die Firewall der VM so
   konfigurieren, dass Port 8080 nicht direkt aus dem Internet erreichbar ist
   (nur über den Proxy). Das Shared Secret ersetzt keine Transportverschlüsselung.
6. In Supabase die Secrets für die Edge Functions setzen, damit
   `scan-document` den Dienst erreichen kann:
   ```bash
   supabase secrets set AV_SCANNER_URL=https://<deine-domain>/scan
   supabase secrets set AV_SCANNER_SECRET=<dasselbe Secret wie in .env>
   ```

## Lokal testen

```bash
docker compose up --build
curl -X POST http://localhost:8080/scan \
  -H "X-Scanner-Secret: $(grep SCANNER_SHARED_SECRET .env | cut -d= -f2)" \
  --data-binary @irgendeine-testdatei.pdf
```

Für einen Funktionstest mit einer *echten* (harmlosen) Testsignatur kann die
[EICAR-Testdatei](https://www.eicar.org/download-anti-malware-testfile/)
verwendet werden — sie wird von ClamAV zuverlässig als "infected" erkannt,
ohne echten Schadcode zu enthalten.
