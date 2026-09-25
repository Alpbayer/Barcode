-- Faz 2: items'a kısa, otomatik artan barkod numarası (Code128'de bu basılır).
-- Supabase SQL Editor'da bir kez çalıştırın. Mevcut satırlar da otomatik numara alır.
alter table items add column barcode_value bigint generated always as identity unique;
