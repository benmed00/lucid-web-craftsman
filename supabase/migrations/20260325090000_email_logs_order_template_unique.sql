-- Email idempotency: previously, sendConfirmationEmail used a check-then-insert
-- pattern against email_logs. Two concurrent confirmation paths (webhook +
-- verify-payment) could both observe no 'sent' row and both dispatch an email,
-- duplicating the customer's inbox and the Brevo bill.
--
-- This partial unique index makes the dedup atomic at the DB layer: only one
-- row with (order_id, template_name) and status='sent' is ever possible, so
-- callers can race and still end up with exactly one sent email.
--
-- Pre-dedupe: legacy duplicates would make CREATE UNIQUE INDEX fail with 23505.
-- Keep the latest sent row per (order_id, template_name); delete older dupes.

WITH dups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, template_name
      ORDER BY sent_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.email_logs
  WHERE status = 'sent' AND order_id IS NOT NULL
)
DELETE FROM public.email_logs
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS email_logs_order_template_sent_unique
  ON public.email_logs (order_id, template_name)
  WHERE status = 'sent' AND order_id IS NOT NULL;

COMMENT ON INDEX public.email_logs_order_template_sent_unique IS
  'Idempotency guard: at most one successful send per (order, template). Callers that observe a unique_violation on insert can treat it as "already sent" and skip the outbound call.';
