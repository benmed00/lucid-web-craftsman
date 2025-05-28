// File_name: src\hooks\api\useInstagramPosts.ts

import { useEffect, useState } from "react";
import { BASE_URL, INSTAGRAM_ENDPOINT } from "@/config/constants";
import { instagramPosts } from "@/api/data/instaSection";
// No need to import Vite env variables as we'll use process.env.NODE_ENV

import { InstagramPost } from "@/shared/interfaces/InstagramPost.interface";

export const useInstagramPosts = () => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts: () => Promise<void> = async () => {
      try {
        // Try to fetch from API first in all environments
        try {
          const res: Response = await fetch(`${BASE_URL}${INSTAGRAM_ENDPOINT}`);
          if (!res.ok) throw new Error("Failed to fetch posts");
          const data: InstagramPost[] = await res.json();
          setPosts(data);
        } catch (apiError) {
          // If API fails, check if we're in development
          if (process.env.NODE_ENV === 'development') {
            console.warn("API fetch failed in development, falling back to local data", apiError);
            setPosts(instagramPosts);
          } else {
            // In production, rethrow the error
            console.warn("No API detected, fetch failed in production, falling back to local data", apiError);
            setPosts(instagramPosts);
            // throw apiError; // if you want to throw the error
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    void fetchPosts();
  }, [BASE_URL, INSTAGRAM_ENDPOINT]);

  return { posts, loading, error };
};
