-- Phase 2: short auto-incrementing barcode number on items (this is what the Code128 encodes).
-- Run once in the Supabase SQL Editor. Existing rows get numbers automatically too.
alter table items add column barcode_value bigint generated always as identity unique;
