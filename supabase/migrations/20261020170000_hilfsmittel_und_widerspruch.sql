-- Tier 1 der TODO.md: "Antrag auf Hilfsmittel" erweitert das bestehende
-- Antrags-Feature (gleiche Stammdaten-Felder, nur eine zusaetzliche Angabe
-- zum gewuenschten Hilfsmittel); "Widerspruchsschreiben" ist inhaltlich
-- ein anderer Dokumenttyp (Bezug auf einen Bescheid + Begruendung) und
-- bekommt deshalb eine eigene Tabelle, analog zum care_level_applications-
-- Muster.

alter table public.care_level_applications
  drop constraint care_level_applications_antragsart_check,
  add constraint care_level_applications_antragsart_check
    check (antragsart in ('einstufung', 'hoeherstufung', 'hilfsmittel'));

alter table public.care_level_applications
  add column hilfsmittel_bezeichnung text not null default '';

create table public.objection_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  widerspruchsart text not null check (widerspruchsart in ('pflegegrad', 'hilfsmittel')),
  vorname text not null default '',
  nachname text not null default '',
  geburtsdatum date,
  adresse text not null default '',
  email text not null default '',
  pflegekasse text not null default '',
  bescheiddatum date,
  aktenzeichen text not null default '',
  begruendung text not null default '',
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.objection_letters enable row level security;

create trigger objection_letters_set_updated_at
  before update on public.objection_letters
  for each row execute function public.set_updated_at();

create policy "objection_letters_owner_all" on public.objection_letters
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.objection_letters to authenticated;
