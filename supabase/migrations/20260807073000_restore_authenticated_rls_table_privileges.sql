/*
  Restore API privileges for authenticated users on RLS-protected tables.

  The historical migrations recreate policies but do not recreate the grants
  normally supplied by the hosted Supabase bootstrap. Restricting this repair
  to tables with row-level security enabled keeps each table's policies as the
  authorization boundary.
*/
DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity = true
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO authenticated',
      table_record.schema_name,
      table_record.table_name
    );
  END LOOP;
END
$$;
