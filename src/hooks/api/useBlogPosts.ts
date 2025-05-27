
// File_name: src/hooks/api/useBlogPosts.ts

import { BASE_URL, BLOG_ENDPOINT } from "@/config/constants";
import { IBlogPost } from "@/shared/interfaces/IBlogPost";
import { useEffect, useState } from "react";

export const useBlogPosts = () => {
  const [posts, setPosts] = useState<IBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response: Response = await fetch(`${BASE_URL}${BLOG_ENDPOINT}`);
        if (!response.ok) throw new Error("Erreur lors du chargement des articles.");
        const data: IBlogPost[] = await response.json();
        setPosts(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [BASE_URL, BLOG_ENDPOINT]);

  return { posts, loading, error };
};
