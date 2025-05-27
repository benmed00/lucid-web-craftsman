// File_name: src\hooks\api\useInstagramPosts.ts

import { useEffect, useState } from "react";
import { BASE_URL, INSTAGRAM_ENDPOINT } from "@/config/constants";

export interface InstagramPost {
  id: number;
  image: string;
  likes: number;
  // Ajoute d'autres champs si nécessaire
}

export const useInstagramPosts = () => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts: () => Promise<void> = async () => {
      try {
        const res: Response = await fetch(`${BASE_URL}${INSTAGRAM_ENDPOINT}`);
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data: InstagramPost[] = await res.json();
        setPosts(data);
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
