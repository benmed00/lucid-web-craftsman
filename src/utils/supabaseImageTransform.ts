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
  _opts: TransformOptions = {}
): string {
  if (!url) return url ?? '';
  if (typeof url !== 'string') return url;

  // NOTE: l'endpoint /storage/v1/render/image/public/ nécessite l'add-on
  // Supabase "Image Transformation". Il n'est PAS activé sur ce projet
  // (renvoie 403), ce qui casse toutes les images produits/hero.
  //
  // Tant que l'add-on n'est pas activé, on retourne l'URL /object/public/
  // brute (plus lourde mais fonctionnelle). Pour réactiver l'optimisation
  // CDN :
  //   1. Activer "Image Transformation" dans Supabase → Storage → Settings
  //   2. Restaurer la logique de réécriture ci-dessous (voir git history)
  return url;
}
