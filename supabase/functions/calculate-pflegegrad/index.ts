// Edge Function: berechnet aus den gespeicherten assessment_modules-Antworten
// den Pflegegrad und schreibt assessment_results. Laeuft mit der Service-Role
// (RLS wird uebersprungen) -> Autorisierung (Ownership-Check) erfolgt explizit.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  calculatePflegegrad,
  type Module1Answers,
  type Module2Answers,
  type Module3Answers,
  type Module4Answers,
  type Module5Answers,
  type Module6Answers,
  type ScoringRuleset,
} from '../_shared/scoring.ts';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface RequestBody {
  assessmentId: string;
}

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

  // Client mit dem JWT des Aufrufers, nur um die User-ID sicher zu ermitteln.
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

  // Service-Role-Client fuer die eigentlichen Lese-/Schreibzugriffe (umgeht RLS).
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

  const { data: modules, error: modulesError } = await admin
    .from('assessment_modules')
    .select('module_number, answers')
    .eq('assessment_id', assessmentId);

  if (modulesError) {
    return new Response(JSON.stringify({ error: modulesError.message }), { status: 500 });
  }

  const byModule = new Map<number, Record<string, unknown>>(
    (modules ?? []).map((m) => [m.module_number, m.answers as Record<string, unknown>]),
  );

  for (let i = 1; i <= 6; i++) {
    if (!byModule.has(i)) {
      return new Response(
        JSON.stringify({ error: `Modul ${i} wurde noch nicht ausgefuellt.` }),
        { status: 422 },
      );
    }
  }

  const { data: ruleset, error: rulesetError } = await admin
    .from('scoring_rulesets')
    .select('id, step_tables, pflegegrad_thresholds')
    .eq('is_active', true)
    .single();

  if (rulesetError || !ruleset) {
    return new Response(JSON.stringify({ error: 'Kein aktives Scoring-Ruleset gefunden.' }), { status: 500 });
  }

  const besondereBedarfskonstellation = Boolean(
    byModule.get(1)?.['besondereBedarfskonstellation'],
  );

  const result = calculatePflegegrad(
    {
      module1: byModule.get(1) as unknown as Module1Answers,
      module2: byModule.get(2) as unknown as Module2Answers,
      module3: byModule.get(3) as unknown as Module3Answers,
      module4: byModule.get(4) as unknown as Module4Answers,
      module5: byModule.get(5) as unknown as Module5Answers,
      module6: byModule.get(6) as unknown as Module6Answers,
      besondereBedarfskonstellation,
    },
    ruleset as unknown as ScoringRuleset,
  );

  const moduleUpdates = (Object.entries(result.moduleRawScores) as Array<[string, number]>).map(
    ([key, rawScore]) => {
      const moduleNumber = Number(key.replace('m', ''));
      const weightedScore = result.moduleWeightedScores[key as keyof typeof result.moduleWeightedScores];
      return admin
        .from('assessment_modules')
        .update({ raw_score: rawScore, weighted_score: weightedScore })
        .eq('assessment_id', assessmentId)
        .eq('module_number', moduleNumber);
    },
  );
  await Promise.all(moduleUpdates);

  const { error: upsertError } = await admin.from('assessment_results').upsert(
    {
      assessment_id: assessmentId,
      total_score: result.totalScore,
      pflegegrad: result.pflegegrad,
      besondere_bedarfskonstellation: result.besondereBedarfskonstellation,
      module_scores: { ...result.moduleWeightedScores, m2_or_m3_used: result.m2OrM3Used },
      ruleset_version_id: ruleset.id,
    },
    { onConflict: 'assessment_id' },
  );

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  }

  await admin
    .from('assessments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', assessmentId);

  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
