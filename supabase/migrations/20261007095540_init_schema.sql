-- Pflegegrad-App: initiales Schema, RLS-Policies, Helper-Funktionen.
-- Siehe Architektur-Plan (documents/attachments Begutachtungsmodul/BRi) fuer fachlichen Hintergrund.

create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- fuer spaetere RAG-Phase (document_embeddings)

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- is_admin()/owns_assessment() werden bewusst erst NACH den Tabellen
-- profiles/assessments definiert (siehe unten): LANGUAGE SQL-Funktionen
-- werden von Postgres beim CREATE bereits semantisch gegen die referenzierten
-- Tabellen geprueft, anders als bei LANGUAGE PLPGSQL.

-- ---------------------------------------------------------------------------
-- profiles (1:1 zu auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  consent_health_data_at timestamptz,
  marketing_opt_in boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Nutzer duerfen ihre Rolle nicht selbst aendern (Privilege-Escalation-Schutz):
-- nur ausgewaehlte Spalten sind fuer die Rolle "authenticated" ueberhaupt
-- per UPDATE erreichbar; role/id bleiben ausserhalb jeder Grant-Liste und
-- koennen nur durch die service_role (z.B. Admin-Freischaltung) geaendert werden.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, marketing_opt_in, consent_health_data_at, deletion_requested_at)
  on public.profiles to authenticated;

-- Automatisches Anlegen eines profiles-Datensatzes bei Registrierung.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- scoring_rulesets (Stufentabellen/Schwellen, administrierbar)
-- ---------------------------------------------------------------------------

create table public.scoring_rulesets (
  id uuid primary key default gen_random_uuid(),
  version_label text not null unique,
  valid_from date not null,
  valid_to date,
  step_tables jsonb not null,
  pflegegrad_thresholds jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.scoring_rulesets enable row level security;

create policy "scoring_rulesets_select_all" on public.scoring_rulesets
  for select using (auth.role() = 'authenticated');

create policy "scoring_rulesets_admin_write" on public.scoring_rulesets
  for all using (public.is_admin()) with check (public.is_admin());

-- Tabellen-Grants: Zugriff auf Zeilenebene steuert RLS oben; ohne diese
-- GRANTs duerfte die Rolle "authenticated" gar nicht erst lesen/schreiben
-- (Supabase exponiert neue Tabellen seit Config-Default nicht mehr automatisch).
grant select, insert, update, delete on public.scoring_rulesets to authenticated;

-- ---------------------------------------------------------------------------
-- guide_templates (Leitfaden-Textbausteine, administrierbar)
-- ---------------------------------------------------------------------------

create table public.guide_templates (
  id uuid primary key default gen_random_uuid(),
  pflegegrad int check (pflegegrad between 0 and 5),
  module_number int check (module_number between 1 and 6),
  -- Entspricht den 5 Schweregrad-Stufen aus der BRi-Stufentabelle je Modul
  -- (vgl. step_tables in scoring_rulesets), nicht einer eigenen Skala.
  score_band text check (score_band in ('keine', 'geringe', 'erhebliche', 'schwere', 'schwerste')),
  title text not null,
  body_markdown text not null,
  is_active boolean not null default true,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table public.guide_templates enable row level security;

create trigger guide_templates_set_updated_at
  before update on public.guide_templates
  for each row execute function public.set_updated_at();

create policy "guide_templates_select_all" on public.guide_templates
  for select using (auth.role() = 'authenticated');

create policy "guide_templates_admin_write" on public.guide_templates
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.guide_templates to authenticated;

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  schema_version int not null default 1,
  current_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.assessments enable row level security;

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

create policy "assessments_owner_all" on public.assessments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.assessments to authenticated;

create or replace function public.owns_assessment(target_assessment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.assessments
    where id = target_assessment_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- assessment_modules
-- ---------------------------------------------------------------------------

create table public.assessment_modules (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  module_number int not null check (module_number between 1 and 6),
  answers jsonb not null default '{}'::jsonb,
  raw_score numeric,
  weighted_score numeric,
  updated_at timestamptz not null default now(),
  unique (assessment_id, module_number)
);

alter table public.assessment_modules enable row level security;

create trigger assessment_modules_set_updated_at
  before update on public.assessment_modules
  for each row execute function public.set_updated_at();

create policy "assessment_modules_owner_all" on public.assessment_modules
  for all using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));

grant select, insert, update, delete on public.assessment_modules to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_results
-- ---------------------------------------------------------------------------

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments (id) on delete cascade,
  total_score numeric not null,
  pflegegrad int not null check (pflegegrad between 0 and 5),
  besondere_bedarfskonstellation boolean not null default false,
  module_scores jsonb not null,
  ruleset_version_id uuid not null references public.scoring_rulesets (id),
  created_at timestamptz not null default now()
);

alter table public.assessment_results enable row level security;

create policy "assessment_results_owner_select" on public.assessment_results
  for select using (public.owns_assessment(assessment_id));

-- Nur SELECT fuer Clients: Zeilen werden ausschliesslich von der
-- calculate-pflegegrad Edge Function (service_role, umgeht RLS) geschrieben.
grant select on public.assessment_results to authenticated;

-- ---------------------------------------------------------------------------
-- documents (Metadaten zu Supabase-Storage-Uploads)
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  document_type text not null check (document_type in ('arztbericht', 'gutachten', 'attest', 'sonstiges')),
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'infected', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_owner_select" on public.documents
  for select using (user_id = auth.uid());

create policy "documents_owner_insert" on public.documents
  for insert with check (user_id = auth.uid());

create policy "documents_owner_delete" on public.documents
  for delete using (user_id = auth.uid());

create policy "documents_owner_update" on public.documents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, delete on public.documents to authenticated;
-- scan_status bewusst ausgenommen: nur die scan-document Edge Function
-- (service_role) darf den Scan-Status setzen, nicht der Nutzer selbst.
grant insert (user_id, assessment_id, storage_path, original_filename, mime_type, size_bytes, document_type)
  on public.documents to authenticated;
grant update (document_type) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- guide_reports
-- ---------------------------------------------------------------------------

create table public.guide_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments (id) on delete cascade,
  content_markdown text not null,
  pdf_storage_path text,
  generator_version text not null default 'rulebased-v1',
  created_at timestamptz not null default now()
);

alter table public.guide_reports enable row level security;

create policy "guide_reports_owner_select" on public.guide_reports
  for select using (public.owns_assessment(assessment_id));

-- Nur SELECT: Zeilen werden ausschliesslich von der generate-guide
-- Edge Function (service_role) geschrieben.
grant select on public.guide_reports to authenticated;

-- ---------------------------------------------------------------------------
-- document_embeddings (Phase 6 / RAG) -- Schema bereits vorbereitet, keine
-- Nutzerdaten, kein direkter Client-Zugriff vorgesehen (nur Service-Role).
-- ---------------------------------------------------------------------------

create table public.document_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_document text not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.document_embeddings enable row level security;

create policy "document_embeddings_authenticated_read" on public.document_embeddings
  for select using (auth.role() = 'authenticated');

grant select on public.document_embeddings to authenticated;
