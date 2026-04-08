-- Recurring maintenance reminders
CREATE TABLE IF NOT EXISTS public.sas_recurring_reminders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_recurring_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin recurring reminders" ON public.sas_recurring_reminders;
CREATE POLICY "Users access own or team/admin recurring reminders"
ON public.sas_recurring_reminders
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_recurring_reminders_user_id
  ON public.sas_recurring_reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_recurring_reminders_due_date
  ON public.sas_recurring_reminders ((data->>'nextDueDate'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_recurring_reminders;

-- Activity log for reminder delivery / booking actions
CREATE TABLE IF NOT EXISTS public.sas_recurring_reminder_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  reminder_id bigint,
  event_type text NOT NULL,
  status text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.sas_recurring_reminder_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin recurring reminder activity" ON public.sas_recurring_reminder_activity;
CREATE POLICY "Users access own or team/admin recurring reminder activity"
ON public.sas_recurring_reminder_activity
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_recurring_reminder_activity_user_id
  ON public.sas_recurring_reminder_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_recurring_reminder_activity_reminder_id
  ON public.sas_recurring_reminder_activity (reminder_id);
