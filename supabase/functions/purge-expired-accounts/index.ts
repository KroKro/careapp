// Edge Function fuer Art. 17 DSGVO, zwei Aufgaben in einem taeglichen Lauf:
// 1. Accounts, die seit INACTIVITY_MONTHS nicht mehr eingeloggt waren und
//    noch keine Loeschung beantragt haben, automatisch fuer die Loeschung
//    vormerken (gleiche 14-Tage-Widerrufsfrist wie bei expliziter Anfrage --
//    ein Login in dieser Zeit setzt die Vormerkung implizit nicht zurueck;
//    das Konto muss aktiv auf der Account-Seite "Loeschung abbrechen" klicken).
//    Ein separates Erinnerungs-E-Mail fehlt hier bewusst noch (kein
//    E-Mail-Anbieter ausgewaehlt, siehe offene Punkte im Plan) -- vor
//    Produktivbetrieb nachruesten.
// 2. Accounts, deren 14-taegige Widerrufsfrist (profiles.deletion_requested_at)
//    abgelaufen ist, endgueltig loeschen.
// Wird NICHT von Nutzern aufgerufen, sondern per pg_cron/pg_net mit einem
// geteilten Secret (siehe README.md) -- daher verify_jwt=false in config.toml
// und eine eigene Pruefung per X-Internal-Secret-Header hier.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GRACE_PERIOD_DAYS = 14;
const INACTIVITY_MONTHS = 24;
const BUCKETS = ['documents', 'guides'];

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('INTERNAL_CRON_SECRET');
  if (!expectedSecret || req.headers.get('X-Internal-Secret') !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), { status: 401 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const flaggedForInactivity = await flagInactiveAccounts(admin);

  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: dueProfiles, error: queryError } = await admin
    .from('profiles')
    .select('id')
    .not('deletion_requested_at', 'is', null)
    .lte('deletion_requested_at', cutoff);

  if (queryError) {
    return new Response(JSON.stringify({ error: queryError.message }), { status: 500 });
  }

  const purgedIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  for (const { id: userId } of dueProfiles ?? []) {
    try {
      for (const bucket of BUCKETS) {
        const { data: objects } = await admin.storage.from(bucket).list(userId);
        const paths = (objects ?? []).map((o) => `${userId}/${o.name}`);
        if (paths.length > 0) {
          await admin.storage.from(bucket).remove(paths);
        }
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      purgedIds.push(userId);
    } catch (err) {
      failures.push({ id: userId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(JSON.stringify({ flaggedForInactivity, purged: purgedIds, failures }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// deno-lint-ignore no-explicit-any
async function flagInactiveAccounts(admin: any): Promise<string[]> {
  const cutoffMs = Date.now() - INACTIVITY_MONTHS * 30 * 24 * 60 * 60 * 1000;
  const inactiveIds: string[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      const lastActive = user.last_sign_in_at ?? user.created_at;
      if (new Date(lastActive).getTime() < cutoffMs) {
        inactiveIds.push(user.id);
      }
    }
    if (data.users.length < perPage) break;
    page++;
  }

  if (inactiveIds.length === 0) return [];

  const { data: alreadyFlagged } = await admin
    .from('profiles')
    .select('id')
    .in('id', inactiveIds)
    .not('deletion_requested_at', 'is', null);
  const alreadyFlaggedIds = new Set((alreadyFlagged ?? []).map((p: { id: string }) => p.id));

  const toFlag = inactiveIds.filter((id) => !alreadyFlaggedIds.has(id));
  if (toFlag.length === 0) return [];

  await admin
    .from('profiles')
    .update({ deletion_requested_at: new Date().toISOString() })
    .in('id', toFlag);

  return toFlag;
}
