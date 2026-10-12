// Edge Function: Admin-Nutzerübersicht. Liefert bewusst NUR Account-
// Stammdaten (E-Mail, Registrierung, Rolle, Lösch-Status, Einwilligungs-
// Zeitstempel, letzter Login) -- KEINE Gesundheitsdaten (assessments/
// assessment_modules/documents). Siehe Architektur-Plan: der Admin-Bereich
// darf aus Datenminimierungsgruenden keine Gesundheitsdaten einzelner Nutzer
// einsehen, RLS gewaehrt admin dafuer auch bewusst keinen Zugriff.
//
// E-Mails liegen in auth.users, das per Client-RLS nicht abrufbar ist --
// daher Service-Role noetig. Die Admin-Pruefung erfolgt deshalb VOR dem
// Service-Role-Zugriff, ueber die gleiche public.is_admin()-Funktion, die
// auch die RLS-Policies nutzen.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  consent_health_data_at: string | null;
  deletion_requested_at: string | null;
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

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert.' }), { status: 401 });
  }

  const { data: isAdmin, error: adminCheckError } = await callerClient.rpc('is_admin');
  if (adminCheckError || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Kein Zugriff.' }), { status: 403 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const authUsers: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = [];
  let page = 1;
  const perPage = 1000;
  // deno-lint-ignore no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, role, consent_health_data_at, deletion_requested_at, created_at');
  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
  }

  const profileById = new Map((profiles ?? []).map((p) => [p['id'] as string, p]));

  const users: AdminUserRow[] = authUsers.map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: (profile?.['created_at'] as string) ?? u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: (profile?.['role'] as string) ?? 'user',
      consent_health_data_at: (profile?.['consent_health_data_at'] as string) ?? null,
      deletion_requested_at: (profile?.['deletion_requested_at'] as string) ?? null,
    };
  });

  users.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
