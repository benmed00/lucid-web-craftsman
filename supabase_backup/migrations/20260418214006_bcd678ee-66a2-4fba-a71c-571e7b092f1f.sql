-- Invoices table: immutable snapshot per order
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  invoice_number text unique not null,
  json_snapshot jsonb not null,
  html text not null,
  total_amount numeric not null,
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_order_id on public.invoices(order_id);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);

-- Strict RLS: deny all client access. Only service-role (Edge Functions) can read/write.
alter table public.invoices enable row level security;

drop policy if exists "deny_all_invoices" on public.invoices;
create policy "deny_all_invoices"
  on public.invoices
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Private storage bucket for invoice assets (PDF persistence, future-proofing)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Storage policies: deny all client access (service role bypasses RLS)
drop policy if exists "invoices_bucket_deny_all_select" on storage.objects;
create policy "invoices_bucket_deny_all_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'invoices' and false);

drop policy if exists "invoices_bucket_deny_all_insert" on storage.objects;
create policy "invoices_bucket_deny_all_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'invoices' and false);

drop policy if exists "invoices_bucket_deny_all_update" on storage.objects;
create policy "invoices_bucket_deny_all_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'invoices' and false);

drop policy if exists "invoices_bucket_deny_all_delete" on storage.objects;
create policy "invoices_bucket_deny_all_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'invoices' and false);