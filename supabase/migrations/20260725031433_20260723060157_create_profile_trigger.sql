/*
# Create profile auto-creation trigger

## Overview
When a new user signs up via Supabase Auth, this trigger automatically creates a corresponding row in the `profiles` table with default values. This ensures every authenticated user has a profile without requiring a separate API call.

## Changes
1. Creates a `handle_new_user` function that inserts a new row into `profiles` using the new user's ID and email.
2. Creates a trigger on `auth.users` that fires `handle_new_user` after each insert.

## Security
- The function runs with `SECURITY DEFINER` so it can insert into the `profiles` table regardless of the caller's RLS context.
- The trigger fires only on INSERT, so existing users are unaffected.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
