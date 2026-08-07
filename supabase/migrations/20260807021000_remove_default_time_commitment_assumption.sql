-- Existing profile time commitments were never user-selected.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_time_commitment_check;

UPDATE public.profiles
SET time_commitment = 'Not specified'
WHERE time_commitment = 'Part-time';

ALTER TABLE public.profiles
  ALTER COLUMN time_commitment SET DEFAULT 'Not specified',
  ADD CONSTRAINT profiles_time_commitment_check
  CHECK (time_commitment IN ('Not specified', 'Light', 'Part-time', 'Full-time'));
