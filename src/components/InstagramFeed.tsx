// File_name: src\components\InstagramFeed.tsx
// Description: Instagram feed component for displaying images with likes and comments.

import { useState } from "react";
import { getImageUrl } from "@/utils/imageUtils";
import { useInstagramPosts } from "@/hooks/api/useInstagramPosts";

const InstagramFeed = () => {
  const { posts, loading, error } = useInstagramPosts();

  const ImageWithFallback = ({ src, alt }: { src: string; alt: string }) => {
    const [error, setError] = useState(false);

    return error ? (
      <div className="bg-gray-100 w-full h-full flex items-center justify-center">
        Image unavailable
      </div>
    ) : (
      <img src={src} alt={alt} onError={() => setError(true)} loading="lazy" />
    );
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error}</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {posts.map((post) => (
        <a
          key={post.id}
          role="link" tabIndex={0} onClick={() => console.log('pas encore de lien')}
          className="block relative group overflow-hidden rounded-md aspect-square"
        >
          <ImageWithFallback
            src={getImageUrl(post.image)}
            alt={`Instagram post ${post.id}`}
          />
          <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity duration-300">
            <div className="text-white flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{post.likes}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default InstagramFeed;
