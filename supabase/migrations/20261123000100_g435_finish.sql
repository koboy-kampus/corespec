-- Phase 19: the Logitech G435's finish loses "fabric".
--
-- The rebuilt headset model (a headset hanging on an under-desk hook, 23 Nov)
-- has no fabric material any more, so the website would skip the item's row
-- (a finish may only name its model's materials) and show the JSON copy.
-- This removes that one key and keeps the rest of the finish (dark, accent).
--
-- Only touches the row while it still has the key, so running it again
-- changes nothing; the audit trigger logs the change like any admin edit.
-- supabase/seed.sql has the same finish. On the real project this was
-- already done by hand (23 Nov).
--
-- Rerunnable. Run after 20261122000100_item_finish.sql.

update public.items
set finish = finish - 'fabric'
where id = 'headset-logitech-g435-lightspeed'
  and finish ? 'fabric';
