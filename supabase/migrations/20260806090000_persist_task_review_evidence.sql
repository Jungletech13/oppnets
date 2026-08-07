/*
# Persist task review evidence

Adds storage for task comments, revision history, and structured feedback that
already exist in the application domain model. Also expands the task status
constraint to include the existing "Needs discussion" workflow state.
*/

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS comments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback jsonb;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check CHECK (
    status IN (
      'Not started',
      'In progress',
      'Ready for review',
      'Changes requested',
      'Needs discussion',
      'Approved',
      'Blocked',
      'Completed'
    )
  );

DROP POLICY IF EXISTS "delete_owned_spaces" ON public.collaboration_spaces;
CREATE POLICY "delete_owned_spaces"
  ON public.collaboration_spaces
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.opportunities
      WHERE opportunities.id = collaboration_spaces.opportunity_id
        AND opportunities.owner_id = auth.uid()
    )
  );
