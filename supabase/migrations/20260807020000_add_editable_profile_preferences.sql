-- Persist every profile preference displayed by the application.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS time_commitment text NOT NULL DEFAULT 'Part-time';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_availability_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_availability_check
      CHECK (availability IN ('Available', 'Limited', 'Unavailable'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_time_commitment_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_time_commitment_check
      CHECK (time_commitment IN ('Light', 'Part-time', 'Full-time'));
  END IF;
END
$$;
