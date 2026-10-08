// Edge Function: laedt eine hochgeladene Datei serverseitig aus Storage,
// prueft die Magic Bytes gegen den deklarierten MIME-Type und laesst sie
// durch den selbst betriebenen AV-Scanner (siehe infra/av-scanner) pruefen.
// Laeuft mit der Service-Role -> Autorisierung (Ownership-Check) erfolgt
// explizit.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { matchesDeclaredType } from '../_shared/file-signatures.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  documentId: string;
}

const BUCKET = 'documents';

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const response = await handle(req);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert.' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const scannerUrl = Deno.env.get('AV_SCANNER_URL');
  const scannerSecret = Deno.env.get('AV_SCANNER_SECRET');

  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert.' }), { status: 401 });
  }
  const callerId = userData.user.id;

  const { documentId }: RequestBody = await req.json();
  if (!documentId) {
    return new Response(JSON.stringify({ error: 'documentId fehlt.' }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: doc, error: docError } = await admin
    .from('documents')
    .select('id, user_id, storage_path, mime_type, scan_status')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    return new Response(JSON.stringify({ error: 'Dokument nicht gefunden.' }), { status: 404 });
  }
  if (doc.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff auf dieses Dokument.' }), { status: 403 });
  }
  if (doc.scan_status !== 'pending') {
    return new Response(JSON.stringify({ scan_status: doc.scan_status }), { status: 200 });
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from(BUCKET)
    .download(doc.storage_path);

  if (downloadError || !fileData) {
    return new Response(JSON.stringify({ error: 'Datei konnte nicht gelesen werden.' }), { status: 500 });
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());

  if (!matchesDeclaredType(bytes, doc.mime_type)) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]);
    await admin.from('documents').update({ scan_status: 'rejected' }).eq('id', documentId);
    return new Response(JSON.stringify({ scan_status: 'rejected', reason: 'type_mismatch' }), { status: 200 });
  }

  if (!scannerUrl || !scannerSecret) {
    // Kein AV-Scanner konfiguriert (z. B. lokale Entwicklung ohne infra/av-scanner).
    console.warn('AV_SCANNER_URL/AV_SCANNER_SECRET nicht gesetzt -- Scan wird uebersprungen.');
    await admin.from('documents').update({ scan_status: 'clean' }).eq('id', documentId);
    return new Response(JSON.stringify({ scan_status: 'clean', warning: 'scanner_not_configured' }), { status: 200 });
  }

  let scanResult: { clean: boolean; signature: string | null };
  try {
    const scanResponse = await fetch(scannerUrl, {
      method: 'POST',
      headers: { 'X-Scanner-Secret': scannerSecret, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    if (!scanResponse.ok) throw new Error(`Scanner antwortete mit ${scanResponse.status}`);
    scanResult = await scanResponse.json();
  } catch (err) {
    console.error('AV-Scan fehlgeschlagen:', err);
    return new Response(JSON.stringify({ error: 'Virenscan derzeit nicht verfuegbar.' }), { status: 502 });
  }

  if (!scanResult.clean) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]);
    await admin.from('documents').update({ scan_status: 'infected' }).eq('id', documentId);
    return new Response(JSON.stringify({ scan_status: 'infected', signature: scanResult.signature }), { status: 200 });
  }

  await admin.from('documents').update({ scan_status: 'clean' }).eq('id', documentId);
  return new Response(JSON.stringify({ scan_status: 'clean' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
