
CREATE TABLE public.sas_payment_reminders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  invoice_id text NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('7_days', '14_days', '30_days')),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  recipient_email text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

ALTER TABLE public.sas_payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders"
ON public.sas_payment_reminders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_payment_reminders_user_invoice ON public.sas_payment_reminders (user_id, invoice_id);
CREATE INDEX idx_payment_reminders_type ON public.sas_payment_reminders (reminder_type);
