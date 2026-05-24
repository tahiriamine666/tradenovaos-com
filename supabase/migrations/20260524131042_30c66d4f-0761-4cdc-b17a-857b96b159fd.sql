
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-screenshots', 'trade-screenshots', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "trade-screenshots public read"
on storage.objects for select
using (bucket_id = 'trade-screenshots');

create policy "trade-screenshots user insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trade-screenshots user update"
on storage.objects for update to authenticated
using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trade-screenshots user delete"
on storage.objects for delete to authenticated
using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
