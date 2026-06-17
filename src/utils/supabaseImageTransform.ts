/**
 * Transform a Supabase Storage public URL into a render-transformed URL
 * with width/quality/format params. Returns the original URL unchanged
 * when it's not a Supabase Storage URL or already uses the render endpoint.
 *
 * Why: serving the raw /object/public/ image returns the full-resolution
 * file (often 1-2 MB). The /render/image/public/ endpoint resizes and
 * re-encodes on the CDN, typically cutting bytes by 70-90% for product
 * cards and hero images.
 */
export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'origin' | 'webp';
  resize?: 'cover' | 'contain' | 'fill';
}

export function transformSupabaseImage(
  url: string | undefined | null,
  opts: TransformOptions = {}
): string {
  if (!url) return url ?? '';
  if (typeof url !== 'string') return url;
  if (!url.includes('/storage/v1/object/public/')) return url;

  try {
    const rendered = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const u = new URL(rendered);
    const { width, height, quality = 75, format = 'webp', resize = 'cover' } = opts;
    if (width) u.searchParams.set('width', String(width));
    if (height) u.searchParams.set('height', String(height));
    if (quality) u.searchParams.set('quality', String(quality));
    if (format) u.searchParams.set('format', format);
    if (resize) u.searchParams.set('resize', resize);
    return u.toString();
  } catch {
    return url;
  }
}
