-- Barcode — Faz 1 şeması. Supabase SQL Editor'da çalıştırın.
-- Not: Supabase yeni tablolarda RLS'i otomatik açar. Faz 1'de auth olmadığından
-- dosyanın sonunda RLS kapatılıyor. Auth fazında tekrar açılıp policy eklenecek.

create table auctions (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- örn: "Müzayede-21"
  date date,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  lot_no integer,                  -- excel'deki LotNo
  kategori text,                   -- serbest metin, normalize YOK bu fazda
  baslik text not null,
  aciklama text,
  boyut text,                      -- opsiyonel
  qr_code text unique,             -- kullanılmıyor (Faz 2'de Code128 barkoda geçildi)
  barcode_value bigint generated always as identity unique, -- barkoda basılan kısa numara (Faz 2)
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
-- Faz 1: auth yok → RLS kapalı (anon key ile okuma/yazma)
alter table auctions      disable row level security;
alter table items         disable row level security;
alter table auction_items disable row level security;
