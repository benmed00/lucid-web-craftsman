# monitor-payment-events

Operator-facing read of critical `payment_events` rows, aggregated in a
lookback window. Purpose-built for polling by external schedulers
(Vercel Cron, GitHub Actions cron, Datadog synthetic checks, PagerDuty
webhook probes, Slack webhook shims).

**Not** a user surface. Service-role or rotating token only.

---

## At a glance

|                   |                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Method / path** | `GET \| POST /functions/v1/monitor-payment-events`                                                           |
| **Gateway auth**  | `apikey: <SUPABASE_ANON_KEY>` (Supabase standard)                                                            |
| **Function auth** | `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` **OR** `x-monitor-token: <MONITOR_PAYMENT_EVENTS_TOKEN>` |
| **Query param**   | `window_minutes` (int, default 15, min 1, max 10080 = 7 days)                                                |
| **Body**          | none (both verbs accepted; `GET` preferred)                                                                  |
| **Returns (200)** | `{ window_minutes, generated_at, total_count, highest_severity, events: [...] }`                             |
| **Rate limit**    | none (service-role gated — intentional)                                                                      |
| **DB access**     | service role; wraps `payment_events_unacked_since(p_since interval)`                                         |
| **Logs**          | structured JSON: `{ fn, step, reason?, ... }`                                                                |
| **Env vars**      | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `MONITOR_PAYMENT_EVENTS_TOKEN`                         |
| **Tests**         | 22 handler-layer (auth, method, window parsing, shape, error paths)                                          |
| **OpenAPI**       | `openapi.fragment.json` — picked up by `pnpm run openapi:edge-functions`                                     |
| **Deploy**        | `supabase functions deploy monitor-payment-events`                                                           |

---

## Response shape

```jsonc
{
  "window_minutes": 15,
  "generated_at": "2026-04-25T12:00:00.000Z",
  "total_count": 3, // sum of occurrence_count across events
  "highest_severity": "critical", // critical > error > warning > info
  "events": [
    {
      "event_type": "webhook_unsigned_rejected",
      "severity": "critical",
      "occurrence_count": 2,
      "first_seen": "2026-04-25T11:58:12.000Z",
      "last_seen": "2026-04-25T11:59:01.000Z",
      "sample_message": "Missing stripe-signature header",
    },
    // …one row per (event_type, severity) observed in the window
  ],
}
```

Rows are sorted by severity (critical first), then by `last_seen` DESC —
so the first row is the loudest thing operators should look at. The
handler does **not** reorder; sorting is owned by the SQL function.

---

## Critical event catalog

Defined in migration `20260425120000_payment_events_monitoring.sql`.

| Severity   | `event_type`                      | Producer                                                  | Meaning                                                                                                                            |
| ---------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `critical` | `webhook_signature_invalid`       | `stripe-webhook`                                          | Stripe signature verification failed. Attacker probing, secret rotation mismatch, or clock skew.                                   |
| `critical` | `webhook_unsigned_rejected`       | `stripe-webhook`                                          | Webhook arrived without `stripe-signature` header AND secret-bypass escape hatch is NOT set. Function is correctly failing closed. |
| `critical` | `webhook_unsigned_accepted`       | `stripe-webhook`                                          | `STRIPE_WEBHOOK_ALLOW_UNSIGNED=true` was set and a request was accepted. Should NEVER fire in prod — page immediately.             |
| `error`    | `webhook_confirmation_failed`     | `stripe-webhook`                                          | Valid signature but `confirmOrderFromStripe` returned an error. Usually a race with `verify-payment` or a DB transient.            |
| `error`    | `webhook_missing_order_id`        | `stripe-webhook`                                          | Stripe session metadata had no `order_id`. Data-mapping bug upstream (`create-payment`).                                           |
| `warning`  | `pricing_snapshot_persist_failed` | `stripe-webhook` / `verify-payment` / `reconcile-payment` | Stripe `listLineItems` or the DB write failed. Order is still paid, but the confirmation email / SPA may show inconsistent totals. |
| `error`    | `payment_failed`                  | `stripe-webhook`                                          | `payment_intent.payment_failed` webhook. Expected baseline rate; a spike still matters.                                            |
| `error`    | `payment_initiation_failed`       | `create-payment`                                          | Checkout session could not be created. Often Stripe API outage.                                                                    |

Adding a new event type is a one-line migration — extend the
`event_type IN (...)` list in the view and the `CASE ... severity` map.

---

## Operator runbook

### Wire up a cron

Any scheduler that can hit an HTTP endpoint works. Examples:

<details open>
<summary>GitHub Actions (every 5 minutes)</summary>

Checked-in workflow: [`.github/workflows/monitor-payment-events.yml`](../../../.github/workflows/monitor-payment-events.yml) (polls every 5 minutes with `window_minutes=10`). Add repository secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `MONITOR_PAYMENT_EVENTS_TOKEN`.

```yaml
# .github/workflows/monitor-payment-events.yml
on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - name: Poll monitor-payment-events
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          MONITOR_PAYMENT_EVENTS_TOKEN: ${{ secrets.MONITOR_PAYMENT_EVENTS_TOKEN }}
        run: |
          resp=$(curl -sfS \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "x-monitor-token: $MONITOR_PAYMENT_EVENTS_TOKEN" \
            "$SUPABASE_URL/functions/v1/monitor-payment-events?window_minutes=10")
          severity=$(echo "$resp" | jq -r .highest_severity)
          count=$(echo "$resp"    | jq -r .total_count)
          echo "severity=$severity count=$count"
          if [ "$severity" = "critical" ]; then
            # Post to Slack / PagerDuty / …
            exit 1
          fi
```

</details>

<details>
<summary>Supabase pg_cron (DB-side, no HTTP)</summary>

If you prefer the check to stay inside Postgres, you can poll directly
against the SQL function and forward via `pg_net`:

```sql
SELECT cron.schedule(
  'payment-events-critical-probe',
  '*/5 * * * *',
  $$
    WITH agg AS (
      SELECT
        COALESCE(SUM(occurrence_count), 0) AS total,
        (ARRAY_AGG(severity ORDER BY CASE severity
          WHEN 'critical' THEN 1
          WHEN 'error'    THEN 2
          WHEN 'warning'  THEN 3
          ELSE 4
        END))[1] AS highest
      FROM public.payment_events_unacked_since(interval '10 minutes')
    )
    SELECT net.http_post(
      'https://hooks.slack.com/services/...',
      jsonb_build_object(
        'text',
        format(
          'payment-events: severity=%s count=%s',
          (SELECT highest FROM agg),
          (SELECT total FROM agg)
        )
      )::text,
      ARRAY[]::net.http_header[]
    )
    WHERE (SELECT highest FROM agg) = 'critical';
  $$
);
```

</details>

### Interpret `highest_severity`

- **`critical`** — data safety or gateway integrity problem. Page oncall
  within 5 minutes. Check Supabase function logs for the parent `fn` and
  look for `webhook_unsigned_rejected` patterns; verify
  `STRIPE_WEBHOOK_SECRET` is set and matches the Stripe dashboard.
- **`error`** — user-visible or state-integrity errors. Ticket and
  address within the day; rate spike → page.
- **`warning`** — degraded path that recovered (typical:
  `pricing_snapshot_persist_failed`). Ticket; verify the customer's
  email still matches Stripe on a sample order.
- **`info`** — baseline; no action.

### Window tuning

- Default 15 min is tuned for a 5-minute cron; gives you 2-3 overlapping
  polls before the same event slides out of the window, which keeps
  alerting idempotent.
- For weekly audits: `window_minutes=10080` (7 days).
- Window only moves the lower bound — there's no upper bound, so rerunning
  with a wider window is always safe.

### Troubleshooting

| Symptom                                          | Likely cause                                                 | Next step                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `401 Unauthorized`                               | Missing/wrong `Authorization` or `x-monitor-token`           | Verify secret value in scheduler                                                             |
| `500 Database error`                             | Postgrest error on the RPC                                   | `select * from pg_stat_activity where application_name like '%postgrest%'`                   |
| `500 Internal server error`                      | Unhandled exception                                          | Check edge function logs (step: `unexpected`)                                                |
| `highest_severity: "info"` but you expect events | Events are older than `window_minutes`                       | Widen with `?window_minutes=60`                                                              |
| Row count looks capped                           | Aggregate is unbounded by design; check the underlying table | `select count(*) from payment_events_critical where created_at >= now() - interval '1 hour'` |

---

## Dev notes

### Run locally

```bash
# Typecheck
deno check --config supabase/functions/deno.json \
  supabase/functions/monitor-payment-events/index.ts \
  supabase/functions/monitor-payment-events/handler.ts \
  supabase/functions/monitor-payment-events/handler_test.ts

# Tests
deno test --config supabase/functions/deno.json --allow-env \
  supabase/functions/monitor-payment-events/
```

### File map

```
supabase/functions/monitor-payment-events/
├── index.ts                  thin Deno.serve wrapper (env + delegate)
├── handler.ts                exported handleRequest + typed row helpers
├── handler_test.ts           22 tests
├── openapi.fragment.json     merged by pnpm run openapi:edge-functions
└── README.md                 this file

supabase/migrations/
└── 20260425120000_payment_events_monitoring.sql
                              payment_events_critical view
                              + payment_events_unacked_since(interval) SQL function
```

### See also

- [`_shared/rate-limit/`](../_shared/rate-limit/) — shared rate-limit
  primitives (same pattern: `index.ts` + `handler.ts` split).
- [`get-order-by-token/README.md`](../get-order-by-token/README.md) —
  reference for the structured-log + testable-handler layout this
  function follows.
