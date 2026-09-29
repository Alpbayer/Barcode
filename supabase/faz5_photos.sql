-- Photos: first two photos of each LotNo series (N.jpg, N-2.jpg), originals stored in Supabase Storage.
-- Run once in the Supabase SQL Editor.

create table item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  position smallint not null check (position in (1, 2)), -- 1 = N.jpg, 2 = N-2.jpg
  path text not null,                                     -- object path inside the item-photos bucket
  created_at timestamptz default now(),
  unique (item_id, position)
);
-- No auth yet → RLS disabled like the other tables.
alter table item_photos disable row level security;

-- Public bucket: photos are readable by URL. Browsers upload directly (Vercel caps request bodies at ~4.5 MB).
insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', true);

-- Storage always has RLS on; allow the anon key to read/write/delete in this bucket only.
create policy "item_photos_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'item-photos')
  with check (bucket_id = 'item-photos');
