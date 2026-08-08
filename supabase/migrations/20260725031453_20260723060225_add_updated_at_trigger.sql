/*
# Add updated_at trigger for profiles

## Overview
Automatically updates the `updated_at` column on the `profiles` table whenever a row is modified.

## Changes
1. Creates `update_updated_at` function that sets `updated_at = now()`.
2. Creates trigger on `profiles` that fires before each update.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
