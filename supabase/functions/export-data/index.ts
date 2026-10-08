// Edge Function: Art. 20 DSGVO (Datenübertragbarkeit). Baut ein ZIP mit allen
// personenbezogenen Daten des aufrufenden Nutzers zusammen. Nutzt bewusst
// AUSSCHLIESSLICH einen mit dem Nutzer-JWT authentifizierten Client (keine
// Service-Role) -- RLS stellt bereits sicher, dass nur eigene Daten gelesen
// werden koennen, ein Privilegien-Aufstieg ist fuer einen reinen Export nicht
// nötig.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert.' }), { status: 401 });
  }
  const userId = userData.user.id;

  const [{ data: profile }, { data: assessments }, { data: modules }, { data: results }, { data: guides }, { data: documents }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('assessments').select('*').eq('user_id', userId),
      supabase
        .from('assessment_modules')
        .select('*, assessments!inner(user_id)')
        .eq('assessments.user_id', userId),
      supabase
        .from('assessment_results')
        .select('*, assessments!inner(user_id)')
        .eq('assessments.user_id', userId),
      supabase
        .from('guide_reports')
        .select('*, assessments!inner(user_id)')
        .eq('assessments.user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId),
    ]);

  const zip = new JSZip();
  zip.file(
    'daten.json',
    JSON.stringify(
      {
        exportiert_am: new Date().toISOString(),
        profil: profile,
        assessments,
        assessment_module: modules,
        assessment_ergebnisse: results,
        leitfaeden: guides,
        dokumente_metadaten: documents,
      },
      null,
      2,
    ),
  );

  for (const doc of documents ?? []) {
    if (doc.scan_status !== 'clean') continue;
    const { data: fileData } = await supabase.storage.from('documents').download(doc.storage_path);
    if (fileData) {
      zip.file(`dokumente/${doc.id}-${doc.original_filename}`, await fileData.arrayBuffer());
    }
  }

  for (const guide of guides ?? []) {
    if (!guide.pdf_storage_path) continue;
    const { data: fileData } = await supabase.storage.from('guides').download(guide.pdf_storage_path);
    if (fileData) {
      zip.file(`leitfaeden/${guide.assessment_id}.pdf`, await fileData.arrayBuffer());
    }
  }

  // deno-lint-ignore no-explicit-any -- npm-Kompat-Typdefinitionen kollidieren hier mit lib.dom's ArrayBuffer-Generics.
  const zipBytes: any = await zip.generateAsync({ type: 'uint8array' });

  return new Response(zipBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="meine-daten.zip"',
    },
  });
}
