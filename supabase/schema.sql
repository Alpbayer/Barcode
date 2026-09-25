-- Barcode — database schema. Run in the Supabase SQL Editor.
-- Note: Supabase enables RLS on new tables automatically. There's no auth yet,
-- so RLS is disabled at the end of this file. It will be re-enabled with policies in the auth phase.

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
-- No auth yet → RLS disabled (read/write with the anon key)
alter table auctions      disable row level security;
alter table items         disable row level security;
alter table auction_items disable row level security;
