// Edge Function: rendert einen Antrag (Einstufung/Höherstufung/Hilfsmittel)
// als PDF zum Ausdrucken/Faxen oder als E-Mail-Anhang. Es gibt (noch) keinen
// echten elektronischen Übermittlungsweg an die Pflegekassen -- das PDF ist
// daher bewusst der einzige Ausgang fuer sowohl "online versenden" als auch
// "drucken" im Kunden-Flussdiagramm (documents/attachments/2026_10_20/
// 2026_10_19_Antrag_Einstufung_Höherstufung.docx).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { renderMarkdownToPdf } from '../_shared/markdown-to-pdf.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  applicationId: string;
}

const ANTRAGSART_LABELS: Record<string, string> = {
  einstufung: 'Einstufung in einen Pflegegrad',
  hoeherstufung: 'Höherstufung des bestehenden Pflegegrads',
  hilfsmittel: 'Versorgung mit einem Hilfsmittel',
};

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const response = await handle(req);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
});

function field(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return `**${label}:** ${value}`;
}

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

  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert.' }), { status: 401 });
  }
  const callerId = userData.user.id;

  const { applicationId }: RequestBody = await req.json();
  if (!applicationId) {
    return new Response(JSON.stringify({ error: 'applicationId fehlt.' }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: application, error: applicationError } = await admin
    .from('care_level_applications')
    .select(
      'id, user_id, antragsart, vorname, nachname, geburtsdatum, adresse, email, pflegekasse, hilfsmittel_bezeichnung, created_at',
    )
    .eq('id', applicationId)
    .single();
  if (applicationError || !application) {
    return new Response(JSON.stringify({ error: 'Antrag nicht gefunden.' }), { status: 404 });
  }
  if (application.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff auf diesen Antrag.' }), { status: 403 });
  }

  const lines: string[] = [];
  lines.push(`# Antrag auf ${ANTRAGSART_LABELS[application.antragsart] ?? application.antragsart}`);
  lines.push('');
  lines.push(
    'Automatisiert aus den im Tool erfassten Angaben erzeugter Antrag. ' +
      'Bitte unterschrieben per Post oder Fax an die zuständige Pflegekasse senden, ' +
      'oder als Anhang in einer E-Mail an die Pflegekasse weiterleiten.',
  );
  lines.push('');
  lines.push('## Antragstellende Person');
  lines.push('');
  const personLines = [
    field('Name', `${application.vorname} ${application.nachname}`.trim()),
    field('Geburtsdatum', application.geburtsdatum),
    field('Adresse', application.adresse),
    field('E-Mail', application.email),
  ].filter((l): l is string => Boolean(l));
  lines.push(...personLines);
  lines.push('');
  if (application.antragsart === 'hilfsmittel') {
    lines.push('## Gewünschtes Hilfsmittel');
    lines.push('');
    lines.push(
      field('Hilfsmittel', application.hilfsmittel_bezeichnung) ?? '_Noch kein Hilfsmittel angegeben._',
    );
    lines.push('');
  }
  lines.push('## Pflegekasse');
  lines.push('');
  const kasseLines = [field('Pflegekasse', application.pflegekasse)].filter((l): l is string => Boolean(l));
  lines.push(...(kasseLines.length ? kasseLines : ['_Noch keine Pflegekasse angegeben._']));
  lines.push('');
  lines.push('## Unterschrift');
  lines.push('');
  lines.push('Ort, Datum: ________________________    Unterschrift: ________________________');

  const contentMarkdown = lines.join('\n');
  const pdfBytes = await renderMarkdownToPdf(contentMarkdown);

  const pdfPath = `${callerId}/antrag-${applicationId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from('guides')
    .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
  }

  const { error: updateError } = await admin
    .from('care_level_applications')
    .update({ pdf_storage_path: pdfPath })
    .eq('id', applicationId);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
