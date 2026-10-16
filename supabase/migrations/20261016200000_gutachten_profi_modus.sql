-- Gutachter-Formular (Profi-Modus): neue Rolle, kind-Diskriminator auf
-- assessments, sowie zwei neue Tabellen fuer Stammdaten und die
-- zusaetzlichen Kapitel (1,2,3,6,7,8,9) aus dem offiziellen
-- Formulargutachten (siehe brain.md im Repo-Root fuer Hintergrund).
--
-- Zugriffsmodell bewusst unveraendert: ein Gutachten ist technisch nur
-- eine assessments-Zeile mit user_id = Gutachter:in (die "versicherte
-- Person" ist Freitext innerhalb des Falls, kein verknuepfter Account).
-- owns_assessment() greift dadurch unveraendert, keine neue RLS-Logik noetig.

alter table public.profiles
  drop constraint profiles_role_check,
  add constraint profiles_role_check check (role in ('user', 'admin', 'gutachter'));

alter table public.assessments
  add column kind text not null default 'self' check (kind in ('self', 'gutachten')),
  add column subject_name text,
  add column subject_birthdate date;

-- ---------------------------------------------------------------------------
-- assessment_admin_data (Stammdaten/Verwaltungsdaten, nur kind='gutachten')
-- ---------------------------------------------------------------------------

create table public.assessment_admin_data (
  assessment_id uuid primary key references public.assessments (id) on delete cascade,
  antragsart text,
  erledigungsart text,
  erledigungsort text,
  antragsdatum date,
  bisheriger_pflegegrad int check (bisheriger_pflegegrad between 0 and 5),
  -- Seltener gefilterte Stammdaten (Pflegekasse-Adresse, Verzoegerungsgruende,
  -- Gutachter-Name/Beruf, ...) bewusst als JSONB, gleiche Begruendung wie bei
  -- assessment_modules.answers: Feldliste kann sich noch verschieben.
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.assessment_admin_data enable row level security;

create trigger assessment_admin_data_set_updated_at
  before update on public.assessment_admin_data
  for each row execute function public.set_updated_at();

create policy "assessment_admin_data_owner_all" on public.assessment_admin_data
  for all using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));

grant select, insert, update, delete on public.assessment_admin_data to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_chapters (Kapitel 1,2,3,6,7,8,9 -- generalisiert das
-- assessment_modules-Muster fuer die zusaetzlichen Gutachten-Kapitel, die
-- NICHT in den Pflegegrad-Punktwert einfliessen)
-- ---------------------------------------------------------------------------

create table public.assessment_chapters (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  chapter_key text not null check (chapter_key in ('kap1', 'kap2', 'kap3', 'kap6', 'kap7', 'kap8', 'kap9')),
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (assessment_id, chapter_key)
);

alter table public.assessment_chapters enable row level security;

create trigger assessment_chapters_set_updated_at
  before update on public.assessment_chapters
  for each row execute function public.set_updated_at();

create policy "assessment_chapters_owner_all" on public.assessment_chapters
  for all using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));

grant select, insert, update, delete on public.assessment_chapters to authenticated;
