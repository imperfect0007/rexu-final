-- Fleet vehicles need a unique QR token each, all tied to the same owner profile.
-- The old "one QR per profile" index blocked inserting vehicle QR rows after activation.
drop index if exists public.uq_qr_codes_profile_id;
