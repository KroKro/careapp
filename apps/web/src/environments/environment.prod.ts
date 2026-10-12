// Werte stammen aus dem Supabase-Projekt-Dashboard (Settings → API).
// NUR den "anon public" Key verwenden, niemals den service_role-Key im Frontend.
// anon/publishable Key ist bewusst oeffentlich -- Sicherheit kommt von RLS,
// nicht von der Geheimhaltung dieses Keys.
export const environment = {
  production: true,
  // supabaseUrl: 'https://yodlmummujtdziggvwtd.supabase.co',
  // supabaseAnonKey: 'sb_publishable_tPobYiI49RvZEG2dKWCtDQ_9iv_Hd5E',
  supabaseUrl: 'https://yodlmummujtdziggvwtd.supabase.co',
  supabaseAnonKey: 'sb_publishable_tPobYiI49RvZEG2dKWCtDQ_9iv_Hd5E',
};
