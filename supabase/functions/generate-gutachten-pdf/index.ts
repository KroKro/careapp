// Edge Function: rendert ein vollstaendiges Formulargutachten (Stammdaten +
// Kapitel 1-3, Modul 1-6/Pflegegrad-Ergebnis, Kapitel 6-9) als PDF. Bewusst
// keine pixelgenaue Nachbildung des amtlichen Formulars -- nur eine klar
// strukturierte, vollstaendige Dokumentation aller erfassten Daten. Nutzt
// denselben PDF-Renderer wie generate-guide (_shared/markdown-to-pdf.ts) und
// denselben Storage-Bucket/dieselbe guide_reports-Tabelle, da Struktur und
// RLS-Zugriffsmuster identisch sind.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { renderMarkdownToPdf } from '../_shared/markdown-to-pdf.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  assessmentId: string;
}

const MODULE_LABELS: Record<number, string> = {
  1: 'Mobilität',
  2: 'Kognitive und kommunikative Fähigkeiten',
  3: 'Verhaltensweisen und psychische Problemlagen',
  4: 'Selbstversorgung',
  5: 'Krankheits- und therapiebedingte Anforderungen',
  6: 'Gestaltung des Alltagslebens und sozialer Kontakte',
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

function section(title: string, lines: Array<string | null | undefined | false>): string[] {
  const body = lines.filter((l): l is string => Boolean(l && l.trim().length > 0));
  if (body.length === 0) return [];
  return [`## ${title}`, '', ...body, ''];
}

function field(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? `- ${label}` : null;
  return `**${label}:** ${value}`;
}

function listField(label: string, values: unknown): string | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  return `**${label}:** ${values.join(', ')}`;
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

  const { assessmentId }: RequestBody = await req.json();
  if (!assessmentId) {
    return new Response(JSON.stringify({ error: 'assessmentId fehlt.' }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: assessment, error: assessmentError } = await admin
    .from('assessments')
    .select('id, user_id, kind, subject_name, subject_birthdate')
    .eq('id', assessmentId)
    .single();
  if (assessmentError || !assessment) {
    return new Response(JSON.stringify({ error: 'Gutachten nicht gefunden.' }), { status: 404 });
  }
  if (assessment.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff auf dieses Gutachten.' }), { status: 403 });
  }
  if (assessment.kind !== 'gutachten') {
    return new Response(JSON.stringify({ error: 'Kein Formulargutachten.' }), { status: 422 });
  }

  const [{ data: adminData }, { data: chapters }, { data: modules }, { data: result }] = await Promise.all([
    admin
      .from('assessment_admin_data')
      .select('antragsart, erledigungsart, erledigungsort, antragsdatum, bisheriger_pflegegrad, data')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
    admin.from('assessment_chapters').select('chapter_key, answers').eq('assessment_id', assessmentId),
    admin.from('assessment_modules').select('module_number, weighted_score').eq('assessment_id', assessmentId),
    admin
      .from('assessment_results')
      .select('pflegegrad, total_score, besondere_bedarfskonstellation')
      .eq('assessment_id', assessmentId)
      .maybeSingle(),
  ]);

  const chapterByKey = new Map<string, Record<string, unknown>>(
    (chapters ?? []).map((c) => [c['chapter_key'] as string, c['answers'] as Record<string, unknown>]),
  );
  const kap1 = chapterByKey.get('kap1') ?? {};
  const kap2 = chapterByKey.get('kap2') ?? {};
  const kap3 = chapterByKey.get('kap3') ?? {};
  const kap6 = chapterByKey.get('kap6') ?? {};
  const kap7 = chapterByKey.get('kap7') ?? {};
  const kap8 = chapterByKey.get('kap8') ?? {};
  const kap9 = chapterByKey.get('kap9') ?? {};

  const lines: string[] = [];
  lines.push(`# Formulargutachten – ${assessment.subject_name ?? 'ohne Namen'}`);
  lines.push('');
  lines.push(
    'Automatisiert aus den im Tool erfassten Angaben zusammengestelltes Formulargutachten. ' +
      'Ersetzt keine Prüfung durch die zuständige Stelle.',
  );
  lines.push('');

  const adminJson = (adminData?.['data'] as Record<string, unknown>) ?? {};
  lines.push(
    ...section('Verwaltungs-/Stammdaten', [
      field('Geburtsdatum', assessment.subject_birthdate),
      field('Anlass des Antrags/Auftrags', adminData?.['antragsart']),
      field('Art des Antrags/Gutachtenart', adminJson['gutachtenart']),
      field('Antragsdatum', adminData?.['antragsdatum']),
      field(
        'Bisheriger Pflegegrad',
        adminData?.['bisheriger_pflegegrad'] ? `Pflegegrad ${adminData['bisheriger_pflegegrad']}` : null,
      ),
      field('Erledigungsart', adminData?.['erledigungsart']),
      field('Erledigungsort', adminData?.['erledigungsort']),
      field('Pflegekasse', adminJson['pflegekasseName']),
      field('Gutachter:in', adminJson['gutachterName']),
      field('Berufsbezeichnung', adminJson['gutachterBeruf']),
    ]),
  );

  lines.push(
    ...section('Kapitel 1: Pflegerelevante Vorgeschichte und Versorgungssituation', [
      field('1.1 Pflegerelevante Fremdbefunde', kap1['fremdbefunde']),
      field('1.2 Pflegerelevante Vorgeschichte (Anamnese)', kap1['anamnese']),
      field('Rehabilitationsantrag aktuell gestellt', kap1['rehaAntragGestellt']),
      field('1.3 Vorhandene Hilfsmittel, Pflegehilfsmittel', kap1['hilfsmittel']),
      field('Wohnsituation', kap1['wohnsituation']),
      field('Leistungserbringer', kap1['wohnsituationLeistungserbringer']),
      field('Pflege durch Pflegeeinrichtung', kap1['pflegeDurchEinrichtung']),
      field('Beschreibung der aktuellen Versorgungssituation', kap1['versorgungssituationBeschreibung']),
      field('Präsenz der Pflegeperson(en) am Tage', kap1['praesenzTag']),
      field('Nächtliche Unterstützung', kap1['unterstuetzungNacht']),
      field('Beschreibung der Wohnsituation (ambulant)', kap1['wohnsituationBeschreibung']),
    ]),
  );

  lines.push(...section('Kapitel 2: Gutachterlicher Befund', [kap2['befund'] as string]));

  const diagnosen = (kap3['diagnosen'] as Array<{ bezeichnung?: string; icdCode?: string }>) ?? [];
  lines.push(
    ...section('Kapitel 3: Pflegebegründende Diagnose(n)', [
      ...diagnosen
        .filter((d) => d.bezeichnung)
        .map((d) => `- ${d.bezeichnung}${d.icdCode ? ` (${d.icdCode})` : ''}`),
      field('Weitere Diagnosen', kap3['weitereDiagnosen']),
    ]),
  );

  if (result) {
    const moduleLines = (modules ?? [])
      .sort((a, b) => (a['module_number'] as number) - (b['module_number'] as number))
      .map((m) => `- ${MODULE_LABELS[m['module_number'] as number]}: ${m['weighted_score'] ?? '–'} Punkte`);
    lines.push(
      ...section('Pflegegrad-Ergebnis (Modul 1–6)', [
        field('Pflegegrad', result['pflegegrad']),
        field('Gesamtpunktwert', `${result['total_score']} von 100`),
        field('Besondere Bedarfskonstellation', result['besondere_bedarfskonstellation']),
        ...moduleLines,
      ]),
    );
  }

  lines.push(
    ...section('Kapitel 6: Weitere versorgungsrelevante Informationen', [
      field('6.1.1 Verlassen des Wohnbereichs', kap6['verlassenWohnung']),
      field('6.1.2 Fortbewegung außerhalb', kap6['fortbewegungAusserhalb']),
      field('6.1.3 Nutzung ÖPNV', kap6['nutzungOepnv']),
      field('6.1.4 Mitfahren im Kraftfahrzeug', kap6['mitfahrenKfz']),
      field('6.1.5 Teilnahme an Veranstaltungen', kap6['teilnahmeVeranstaltungen']),
      listField('6.1.6 Besuch Arbeitsplatz/Werkstatt/Tagesbetreuung', kap6['besuchArbeitsplatz']),
      field('6.1.7 Teilnahme an sonstigen Aktivitäten', kap6['teilnahmeSonstigeAktivitaeten']),
      field('Erläuterung Haushaltsführung', kap6['erlaeuterungHaushalt']),
    ]),
  );

  const d1 = (kap7['domain1'] as Record<string, unknown>) ?? {};
  const d2 = (kap7['domain2'] as Record<string, unknown>) ?? {};
  const d3 = (kap7['domain3'] as Record<string, unknown>) ?? {};
  lines.push(
    ...section('Kapitel 7: Empfehlungen zur Förderung/Rehabilitation', [
      field('7.1.1 Mobilität/Selbstversorgung/Haushalt', [d1['therapeutisch'], d1['umgebungHilfsmittel'], d1['praeventiv'], d1['sonstiges']].filter(Boolean).join(' / ')),
      field('7.1.2 Kognitiv/Verhalten/Alltag', [d2['therapeutisch'], d2['umgebungHilfsmittel'], d2['praeventiv'], d2['sonstiges']].filter(Boolean).join(' / ')),
      field('7.1.3 Krankheits-/therapiebedingte Anforderungen', [d3['therapeutisch'], d3['umgebungHilfsmittel'], d3['praeventiv'], d3['sonstiges']].filter(Boolean).join(' / ')),
      listField('7.2 Empfehlungen', kap7['empfehlungen']),
      field('Rehabilitationsbedürftigkeit', kap7['rehaBeduerftigkeit']),
      field('Rehabilitationsziele', kap7['rehaZiele']),
      field('Durchführung', kap7['durchfuehrung']),
      field('Hinweise an die Rehabilitationseinrichtung', kap7['hinweiseEinrichtung']),
    ]),
  );

  lines.push(
    ...section('Kapitel 8: Weitere Empfehlungen und Hinweise für die Pflegekasse', [
      field('Weitere Hilfsmittel-Empfehlungen', kap8['hilfsmittelWeitereEmpfehlungen']),
      field('Physikalische Therapie', kap8['physikalischeTherapie']),
      field('Ergotherapie', kap8['ergotherapie']),
      field('Stimm-/Sprech-/Sprachtherapie', kap8['sprachtherapie']),
      field('Podologie', kap8['podologie']),
      field('Andere therapeutische Maßnahmen', kap8['andereTherapeutischeMassnahmen']),
      field('Wohnumfeldverbessernde Maßnahmen', kap8['wohnumfeldMassnahmen']),
      field('Edukative Maßnahmen/Beratung/Anleitung', kap8['edukativeMassnahmen']),
      field('Präventive Maßnahmen', kap8['praeventiveMassnahmen']),
      field('Pflegeberatung', kap8['pflegeberatung']),
      field('Entlastung der Pflegeperson', kap8['entlastungPflegeperson']),
      field('Widerspruch gegen Übersendung des Gutachtens', kap8['widerspruchUebersendung']),
      field('Sonstige Hinweise', kap8['sonstigeHinweise']),
    ]),
  );

  lines.push(
    ...section('Kapitel 9: Prognose/Wiederholungsbegutachtung', [
      field('Prognose', kap9['prognose']),
      field('Termin für Wiederholungsbegutachtung', kap9['wiederholungstermin']),
      listField(
        'Beteiligte Gutachter:innen',
        [kap9['gutachterName1'], kap9['gutachterName2'], kap9['gutachterName3']].filter(Boolean),
      ),
    ]),
  );

  const contentMarkdown = lines.join('\n');
  const pdfBytes = await renderMarkdownToPdf(contentMarkdown);

  const pdfPath = `${callerId}/gutachten-${assessmentId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from('guides')
    .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
  }

  const { error: upsertError } = await admin.from('guide_reports').upsert(
    {
      assessment_id: assessmentId,
      content_markdown: contentMarkdown,
      pdf_storage_path: pdfPath,
      generator_version: 'gutachten-v1',
    },
    { onConflict: 'assessment_id' },
  );
  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
