

## Add Composite Index on `product_translations`

This is a single SQL migration that creates a composite index to speed up the parallel translation lookups in `getProductsWithTranslations`.

### What it does
When the shop page loads, it queries `product_translations` filtered by `locale` (and joins on `product_id`). Without an index, Postgres does a full table scan each time. A composite index makes these lookups near-instant.

### SQL Migration

```sql
CREATE INDEX IF NOT EXISTS idx_product_translations_locale_product_id
ON public.product_translations (locale, product_id);
```

That's it — one line, applied via the database migration tool. No code changes needed; the existing queries automatically benefit from the index.

### How to apply
I'll run this as a Supabase migration. Alternatively, you can paste it directly in the [SQL Editor](https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/sql/new).

