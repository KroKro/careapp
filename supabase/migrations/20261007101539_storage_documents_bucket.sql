-- Privater Storage-Bucket fuer Nutzer-Uploads (Arztberichte, Gutachten, Atteste).
-- Groessen-/Typ-Limit ist serverseitige Defense-in-Depth zusaetzlich zur
-- Client-Validierung; der echte Magic-Byte-Check erfolgt in der
-- scan-document Edge Function, da der hier hinterlegte MIME-Type nur der
-- vom Client beim Upload gesendete (faelschbare) Content-Type ist.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  15728640, -- 15 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Pfadkonvention: {user_id}/{uuid}-{dateiname}. storage.foldername(name)[1]
-- ist damit immer die user_id des Eigentuemers.

create policy "documents_bucket_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
