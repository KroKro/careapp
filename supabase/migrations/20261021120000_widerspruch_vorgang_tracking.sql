-- Widerspruch als mehrstufiger, nachverfolgter Vorgang statt einmaliger
-- PDF-Generator -- siehe brain.md (Fund aus
-- documents/attachments/2026_10_21/2026_10_20_Prozessbeschreibung_Widerspruch.docx).
--
-- status bildet den Flowchart-Verlauf ab:
--   entwurf -> versendet -> (bescheid_angefordert ->) bescheid_erhalten
--   -> abgeschlossen_erfolgreich | eskaliert_klageverfahren
-- "Klageverfahren" selbst ist im Flowchart ein eigener, nicht detaillierter
-- Folgeprozess (Visio-Shape-Typ "Subprocess") -- wird hier bewusst nur als
-- Endzustand markiert, nicht als eigenes Feature abgebildet.

alter table public.objection_letters
  add column assessment_id uuid references public.assessments (id) on delete set null,
  add column protokoll_termin text not null default '',
  add column status text not null default 'entwurf' check (
    status in (
      'entwurf',
      'versendet',
      'bescheid_angefordert',
      'bescheid_erhalten',
      'abgeschlossen_erfolgreich',
      'eskaliert_klageverfahren'
    )
  ),
  add column versendet_am date,
  add column bescheid_angefordert_am date,
  add column bescheid_erhalten_am date;
