-- Lock down direct database access. Run ONLY AFTER the version that uses SUPABASE_SECRET_KEY is live
-- on Vercel (otherwise the old deployment, which still uses the anon key, stops working).
--
-- RLS on with no policies = the public anon key can't read or write any table.
-- The app's server uses the secret key, which bypasses RLS.
alter table auctions      enable row level security;
alter table items         enable row level security;
alter table auction_items enable row level security;
alter table item_photos   enable row level security;

-- Storage: no more anon writes. The browser uploads with one-time signed URLs issued by the server.
-- The bucket stays public, so photos remain viewable by their (random, unguessable) URL.
drop policy if exists "item_photos_all" on storage.objects;
