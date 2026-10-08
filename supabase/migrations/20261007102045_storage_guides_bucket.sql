-- Privater Storage-Bucket fuer die generierten Leitfaden-PDFs
-- (supabase/functions/generate-guide). Nur die Service-Role schreibt hier
-- (vgl. guide_reports-Policies); Nutzer lesen ausschliesslich ueber
-- kurzlebige Signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guides', 'guides', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "guides_bucket_owner_select" on storage.objects
  for select using (
    bucket_id = 'guides' and (storage.foldername(name))[1] = auth.uid()::text
  );
