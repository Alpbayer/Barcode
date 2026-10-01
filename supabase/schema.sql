-- Barcode — database schema. Run in the Supabase SQL Editor.
-- Access model: RLS is ON with no policies, so the public anon key can't touch any table.
-- The app's server uses SUPABASE_SECRET_KEY (bypasses RLS) behind the site password.

create table auctions (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- e.g. "Müzayede-21"
  date date,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  lot_no integer,                  -- LotNo from the Excel sheet
  kategori text,                   -- free text, not normalized yet
  baslik text not null,
  aciklama text,
  boyut text,                      -- optional
  qr_code text unique,             -- unused (switched to Code128 barcodes in phase 2)
  barcode_value bigint generated always as identity unique, -- short number encoded in the barcode (phase 2)
  created_at timestamptz default now()
);

create table auction_items (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references auctions(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  acilis_fiyati numeric,
  satici_id integer,
  satildi_mi boolean default false,
  satis_fiyati numeric,
  created_at timestamptz default now()
);
alter table auctions      enable row level security;
alter table items         enable row level security;
alter table auction_items enable row level security;

-- Photos. Storage: public bucket 'item-photos' with no policies (reads via public URL,
-- uploads via server-issued signed URLs):
--   insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', true);
create table item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  position smallint not null check (position in (1, 2)), -- 1 = N.jpg, 2 = N-2.jpg
  path text not null,                                     -- object path inside the item-photos bucket
  created_at timestamptz default now(),
  unique (item_id, position)
);
alter table item_photos enable row level security;
