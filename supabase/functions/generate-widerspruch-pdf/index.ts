// Edge Function: rendert ein Widerspruchsschreiben (gegen einen
// Pflegegrad- oder Hilfsmittel-Bescheid) als PDF, analog zu
// generate-antrag-pdf. Gleiches Prinzip: kein echter elektronischer
// Uebermittlungsweg an die Pflegekasse -- PDF zum Ausdrucken/Faxen oder
// als E-Mail-Anhang.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { renderMarkdownToPdf } from '../_shared/markdown-to-pdf.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  letterId: string;
}

const WIDERSPRUCHSART_LABELS: Record<string, string> = {
  pflegegrad: 'den festgestellten Pflegegrad',
  hilfsmittel: 'die Ablehnung eines Hilfsmittels',
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

  const { letterId }: RequestBody = await req.json();
  if (!letterId) {
    return new Response(JSON.stringify({ error: 'letterId fehlt.' }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: letter, error: letterError } = await admin
    .from('objection_letters')
    .select(
      'id, user_id, widerspruchsart, vorname, nachname, geburtsdatum, adresse, email, pflegekasse, bescheiddatum, aktenzeichen, begruendung, protokoll_termin, assessment_id, created_at',
    )
    .eq('id', letterId)
    .single();
  if (letterError || !letter) {
    return new Response(JSON.stringify({ error: 'Widerspruchsschreiben nicht gefunden.' }), { status: 404 });
  }
  if (letter.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff auf dieses Widerspruchsschreiben.' }), { status: 403 });
  }

  // Bei Verknuepfung mit einer eigenen Einschaetzung/Gutachten: Diagnosen
  // (nur bei kind='gutachten', Kap. 3) und Medikamente (Modul 5, beide
  // Arten) als Anhang in die PDF uebernehmen -- siehe Prozessbeschreibung
  // des Auftraggebers ("Alle med. Unterlagen, Diagnosen, Medikamente" als
  // Eingabe fuer die Begruendung). Eigentumspruefung analog zu
  // generate-gutachten-pdf, da assessment_id vom Client kommt.
  let diagnosenLines: string[] = [];
  let medikamenteLines: string[] = [];
  if (letter.assessment_id) {
    const { data: assessment } = await admin
      .from('assessments')
      .select('id, user_id, kind')
      .eq('id', letter.assessment_id)
      .maybeSingle();
    if (assessment && assessment.user_id === callerId) {
      if (assessment.kind === 'gutachten') {
        const { data: kap3 } = await admin
          .from('assessment_chapters')
          .select('answers')
          .eq('assessment_id', letter.assessment_id)
          .eq('chapter_key', 'kap3')
          .maybeSingle();
        const diagnosen =
          (kap3?.answers as Record<string, unknown> | undefined)?.['diagnosen'] as
            | Array<{ bezeichnung?: string; icdCode?: string }>
            | undefined;
        diagnosenLines = (diagnosen ?? [])
          .filter((d) => d.bezeichnung)
          .map((d) => `- ${d.bezeichnung}${d.icdCode ? ` (${d.icdCode})` : ''}`);
      }
      const { data: modul5 } = await admin
        .from('assessment_modules')
        .select('answers')
        .eq('assessment_id', letter.assessment_id)
        .eq('module_number', 5)
        .maybeSingle();
      const medikamente =
        (modul5?.answers as Record<string, unknown> | undefined)?.['medikamente'] as
          | Array<{ name?: string; dosierung?: string; haeufigkeit?: string }>
          | undefined;
      medikamenteLines = (medikamente ?? [])
        .filter((m) => m.name)
        .map((m) => `- ${m.name}${m.dosierung ? `, ${m.dosierung}` : ''}${m.haeufigkeit ? `, ${m.haeufigkeit}` : ''}`);
    }
  }

  const lines: string[] = [];
  lines.push('# Widerspruch');
  lines.push('');
  lines.push(
    'Automatisiert aus den im Tool erfassten Angaben erzeugtes Widerspruchsschreiben. ' +
      'Bitte unterschrieben per Post oder Fax an die zuständige Pflegekasse senden, ' +
      'oder als Anhang in einer E-Mail weiterleiten.',
  );
  lines.push('');
  lines.push('## Absender:in');
  lines.push('');
  const personLines = [
    field('Name', `${letter.vorname} ${letter.nachname}`.trim()),
    field('Geburtsdatum', letter.geburtsdatum),
    field('Adresse', letter.adresse),
    field('E-Mail', letter.email),
  ].filter((l): l is string => Boolean(l));
  lines.push(...personLines);
  lines.push('');
  lines.push('## Pflegekasse');
  lines.push('');
  const kasseLines = [field('Pflegekasse', letter.pflegekasse)].filter((l): l is string => Boolean(l));
  lines.push(...(kasseLines.length ? kasseLines : ['_Noch keine Pflegekasse angegeben._']));
  lines.push('');
  lines.push('## Bezug');
  lines.push('');
  const bezugLines = [
    field('Bescheiddatum', letter.bescheiddatum),
    field('Aktenzeichen', letter.aktenzeichen),
  ].filter((l): l is string => Boolean(l));
  lines.push(...(bezugLines.length ? bezugLines : ['_Noch keine Angaben zum Bescheid._']));
  lines.push('');
  lines.push(
    `Hiermit lege ich Widerspruch gegen ${WIDERSPRUCHSART_LABELS[letter.widerspruchsart] ?? letter.widerspruchsart} ein.`,
  );
  lines.push('');
  lines.push('## Begründung');
  lines.push('');
  lines.push(letter.begruendung || '_Noch keine Begründung angegeben._');
  lines.push('');
  if (letter.protokoll_termin) {
    lines.push('## Protokoll des Begutachtungstermins');
    lines.push('');
    lines.push(letter.protokoll_termin);
    lines.push('');
  }
  if (diagnosenLines.length > 0) {
    lines.push('## Diagnosen');
    lines.push('');
    lines.push(...diagnosenLines);
    lines.push('');
  }
  if (medikamenteLines.length > 0) {
    lines.push('## Medikamente');
    lines.push('');
    lines.push(...medikamenteLines);
    lines.push('');
  }
  lines.push('## Unterschrift');
  lines.push('');
  lines.push('Ort, Datum: ________________________    Unterschrift: ________________________');

  const contentMarkdown = lines.join('\n');
  const pdfBytes = await renderMarkdownToPdf(contentMarkdown);

  const pdfPath = `${callerId}/widerspruch-${letterId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from('guides')
    .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
  }

  const { error: updateError } = await admin
    .from('objection_letters')
    .update({ pdf_storage_path: pdfPath })
    .eq('id', letterId);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
