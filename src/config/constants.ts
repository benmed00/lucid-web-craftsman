/* src/config/constants.ts */

/* Environment-based configuration for Vite projects
* export const BASE_URL = import.meta.env.VITE_API_URL || (
*   import.meta.env.PROD
*     ? 'https://benmed00.github.io/lucid-web-craftsman/'  // Production fallback
*     : 'http://localhost:3001'         // Development fallback
* );
*/

export const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://benmed00.github.io/lucid-web-craftsman/';

// Alternative explicit configuration (choose one approach)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://benmed00.github.io/lucid-web-craftsman/');

// API endpoints
export const API_ENDPOINT = '/api';

// instagram
export const INSTAGRAM_ENDPOINT = '/instagramPosts';
// blog
export const BLOG_ENDPOINT = '/blogPosts';

export const BLOG_POSTS_API_URL = import.meta.env.PROD
  ? "https://ton-site.github.io/lucid-web-craftsman/data/blog-posts.json"
  : "/data/blog-posts.json";
export const INSTAGRAM_FEED_API_URL = import.meta.env.PROD
  ? "https://ton-site.github.io/lucid-web-craftsman/data/instagram-feed.json"
  : "/data/instagram-feed.json";

export const apiUrl : string = import.meta.env.DEV
  ? '/mock/instagram.json'
  : import.meta.env.VITE_API_URL;

// Remove these as they're not needed:
// - process.env references (won't work in client-side Vite)
// - React-specific (REACT_APP_) variables
// - Duplicate configurations   