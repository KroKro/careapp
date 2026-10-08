// Edge Function: erzeugt aus einem abgeschlossenen Assessment einen
// regelbasierten Leitfaden (Markdown + PDF). Bewusst kein LLM -- siehe
// Architektur-Plan Abschnitt 6 (Vorhersagbarkeit bei Gesundheitsdaten).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { renderMarkdownToPdf } from '../_shared/markdown-to-pdf.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  assessmentId: string;
}

const SEVERITY_BANDS = ['keine', 'geringe', 'erhebliche', 'schwere', 'schwerste'] as const;
type SeverityBand = (typeof SEVERITY_BANDS)[number];

interface StepTableEntry {
  max: number;
  value: number;
}

function severityBandForScore(table: StepTableEntry[], weightedScore: number): SeverityBand {
  const sorted = [...table].sort((a, b) => a.max - b.max);
  const index = sorted.findIndex((entry) => entry.value === weightedScore);
  return SEVERITY_BANDS[index === -1 ? 0 : index];
}

const DISCLAIMER =
  'Dieser Leitfaden ist eine automatisiert erstellte Selbsteinschätzung auf Basis deiner ' +
  'eigenen Angaben. Er ersetzt keine Begutachtung durch den Medizinischen Dienst und keine ' +
  'Rechts- oder Gesundheitsberatung. Besprich die Ergebnisse vor Antragstellung mit einer ' +
  'unabhängigen Pflegeberatungsstelle.';

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
    .select('id, user_id')
    .eq('id', assessmentId)
    .single();
  if (assessmentError || !assessment) {
    return new Response(JSON.stringify({ error: 'Assessment nicht gefunden.' }), { status: 404 });
  }
  if (assessment.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff auf dieses Assessment.' }), { status: 403 });
  }

  const { data: result, error: resultError } = await admin
    .from('assessment_results')
    .select('pflegegrad, module_scores, ruleset_version_id')
    .eq('assessment_id', assessmentId)
    .single();
  if (resultError || !result) {
    return new Response(
      JSON.stringify({ error: 'Noch kein Berechnungsergebnis vorhanden. Bitte zuerst die Berechnung ausführen.' }),
      { status: 422 },
    );
  }

  const { data: ruleset, error: rulesetError } = await admin
    .from('scoring_rulesets')
    .select('step_tables')
    .eq('id', result.ruleset_version_id)
    .single();
  if (rulesetError || !ruleset) {
    return new Response(JSON.stringify({ error: 'Scoring-Ruleset nicht gefunden.' }), { status: 500 });
  }

  const moduleScores = result.module_scores as Record<string, number | string>;
  const m2OrM3Used = moduleScores['m2_or_m3_used'] as 'm2' | 'm3';
  const stepTables = ruleset.step_tables as Record<string, StepTableEntry[]>;

  // Modul 1, 4, 5, 6 immer; von Modul 2/3 nur das, dessen gewichteter Wert
  // tatsaechlich in die Gesamtsumme eingeflossen ist (vgl. calculate-pflegegrad).
  const modulesToConsider: Array<{ moduleNumber: number; key: string }> = [
    { moduleNumber: 1, key: 'm1' },
    { moduleNumber: m2OrM3Used === 'm3' ? 3 : 2, key: m2OrM3Used },
    { moduleNumber: 4, key: 'm4' },
    { moduleNumber: 5, key: 'm5' },
    { moduleNumber: 6, key: 'm6' },
  ];

  const moduleSections: Array<{ moduleNumber: number; band: SeverityBand }> = modulesToConsider
    .map(({ moduleNumber, key }) => ({
      moduleNumber,
      band: severityBandForScore(stepTables[key], Number(moduleScores[key])),
    }))
    .filter((s) => s.band === 'erhebliche' || s.band === 'schwere' || s.band === 'schwerste');

  const { data: generalTemplate } = await admin
    .from('guide_templates')
    .select('title, body_markdown')
    .eq('pflegegrad', result.pflegegrad)
    .is('module_number', null)
    .eq('is_active', true)
    .maybeSingle();

  const moduleTemplates: Array<{ title: string; body_markdown: string }> = [];
  for (const section of moduleSections) {
    const { data: template } = await admin
      .from('guide_templates')
      .select('title, body_markdown')
      .eq('module_number', section.moduleNumber)
      .eq('score_band', section.band)
      .eq('is_active', true)
      .maybeSingle();
    if (template) moduleTemplates.push(template);
  }

  const lines: string[] = [];
  lines.push(`# ${generalTemplate?.title ?? `Pflegegrad ${result.pflegegrad}`}`);
  lines.push('');
  lines.push(DISCLAIMER);
  lines.push('');
  if (generalTemplate) {
    lines.push(generalTemplate.body_markdown);
    lines.push('');
  }
  if (moduleTemplates.length > 0) {
    lines.push('## Hinweise zur Vorbereitung je Bereich');
    lines.push('');
    for (const t of moduleTemplates) {
      lines.push(`## ${t.title}`);
      lines.push(t.body_markdown);
      lines.push('');
    }
  }

  const contentMarkdown = lines.join('\n');
  const pdfBytes = await renderMarkdownToPdf(contentMarkdown);

  const pdfPath = `${callerId}/${assessmentId}.pdf`;
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
      generator_version: 'rulebased-v1',
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
