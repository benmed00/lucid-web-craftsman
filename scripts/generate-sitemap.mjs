#!/usr/bin/env node
/**
 * Generate public/sitemap.xml from static routes + live Supabase data.
 *
 * Runs before `vite dev` and `vite build` via the predev/prebuild npm hooks.
 * Fetches products (in_stock = true) and blog posts (status = published)
 * from Supabase using the public anon key, then writes one <url> entry
 * per row alongside the curated static routes.
 *
 * If Supabase is unreachable (offline dev, missing env, etc.) the script
 * logs a warning and still writes the static portion so builds never
 * fail because of sitemap generation.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'public', 'sitemap.xml');

// Project canonical domain — pinned so sitemap entries always match the
// published Lovable host regardless of ambient SITE_URL env vars.
const BASE_URL = 'https://rif-raw-straw.lovable.app';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://xcvlijchkmhjonhfildm.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg';

const TODAY = new Date().toISOString();

/**
 * Public, indexable static routes. Mirrors the <Route> table in src/App.tsx.
 * Excludes:
 *  - Private routes (/cart, /checkout, /profile, /enhanced-profile, /orders,
 *    /order-confirmation, /payment-success, /invoice, /logout, /auth)
 *  - Alias routes that emit noindex + canonical to a target
 *    (/home, /Home, /HOME, /shop)
 *  - Admin routes (/admin/*)
 *  - Catch-all (*)
 */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/story', changefreq: 'monthly', priority: '0.6' },
  { path: '/artisans', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/care-guide', changefreq: 'monthly', priority: '0.7' },
  { path: '/care-guide/straw-bags', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-style-straw-bags', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.5' },
  { path: '/shipping', changefreq: 'monthly', priority: '0.4' },
  { path: '/returns', changefreq: 'monthly', priority: '0.4' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms-of-service', changefreq: 'yearly', priority: '0.3' },
  { path: '/cgv', changefreq: 'yearly', priority: '0.3' },
  { path: '/compare', changefreq: 'weekly', priority: '0.4' },
  { path: '/wishlist', changefreq: 'weekly', priority: '0.4' },
];

async function fetchFromSupabase(path) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchProducts() {
  try {
    return await fetchFromSupabase(
      'products?select=id,slug,updated_at&is_available=eq.true&order=updated_at.desc'
    );
  } catch (err) {
    console.warn(`[sitemap] products fetch failed: ${err.message}`);
    return [];
  }
}

async function fetchBlogPosts() {
  try {
    return await fetchFromSupabase(
      'blog_posts?select=id,slug,updated_at&status=eq.published&order=updated_at.desc'
    );
  } catch (err) {
    console.warn(`[sitemap] blog_posts fetch failed: ${err.message}`);
    return [];
  }
}

function toIso(value) {
  if (!value) return TODAY;
  try {
    return new Date(value).toISOString();
  } catch {
    return TODAY;
  }
}

function renderUrl({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${loc}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

async function main() {
  const [products, posts] = await Promise.all([fetchProducts(), fetchBlogPosts()]);

  const entries = [];

  // Static routes
  for (const r of STATIC_ROUTES) {
    entries.push({
      loc: `${BASE_URL}${r.path}`,
      lastmod: TODAY,
      changefreq: r.changefreq,
      priority: r.priority,
    });
  }

  // Products: one entry per real row from the products table
  for (const p of products) {
    const slugOrId = p.id; // ProductDetail route uses :id
    entries.push({
      loc: `${BASE_URL}/products/${slugOrId}`,
      lastmod: toIso(p.updated_at),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  // Blog posts: one entry per published row
  for (const post of posts) {
    const slugOrId = post.slug || post.id;
    entries.push({
      loc: `${BASE_URL}/blog/${slugOrId}`,
      lastmod: toIso(post.updated_at),
      changefreq: 'monthly',
      priority: '0.6',
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n');

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, xml, 'utf8');

  console.log(
    `[sitemap] wrote ${entries.length} urls (static=${STATIC_ROUTES.length}, products=${products.length}, posts=${posts.length}) -> ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error('[sitemap] generation failed:', err);
  process.exit(1);
});
