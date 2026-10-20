-- Antrag auf Ein-/Höherstufung: eigenständiges, kleines Feature aus der
-- Formulare-Bibliothek (siehe brain.md Backlog), Flow laut Visio-Diagramm
-- in documents/attachments/2026_10_20/2026_10_19_Antrag_Einstufung_Höherstufung.docx.
--
-- Bewusst eine eigene, schlanke Tabelle statt Wiederverwendung von
-- assessments/assessment_chapters: ein Antrag ist kein Pflegegrad-Fall,
-- sondern nur ein Formular mit Stammdaten der antragstellenden Person
-- selbst (nicht einer dritten "versicherten Person" wie beim Gutachten).

create table public.care_level_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  antragsart text not null check (antragsart in ('einstufung', 'hoeherstufung')),
  vorname text not null default '',
  nachname text not null default '',
  geburtsdatum date,
  adresse text not null default '',
  email text not null default '',
  pflegekasse text not null default '',
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_level_applications enable row level security;

create trigger care_level_applications_set_updated_at
  before update on public.care_level_applications
  for each row execute function public.set_updated_at();

create policy "care_level_applications_owner_all" on public.care_level_applications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.care_level_applications to authenticated;
