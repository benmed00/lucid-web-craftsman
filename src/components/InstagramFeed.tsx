// File_name: src\components\InstagramFeed.tsx
// Description: Instagram feed component for displaying images with likes and comments.

import { useState } from "react";

interface InstagramPost {
  id: number;
  image: string;
  likes: number;
  link?: string;

  title?: string;
  description?: string;
  author?: string;
  date?: string;
  views?: number;
  shares?: number;
  commentsCount?: number;
  comments?: string[];
  caption?: string;
  timestamp?: string;
  location?: string;
  hashtags?: string[];
  user?: { user?: string };
  taggedUsers?: string[];
  isVideo?: boolean;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  videoViews?: number;
  videoComments?: string[];
  videoLikes?: number;
  videoShares?: number;
  videoSaves?: number;
  videoReactions?: string[];
  videoDescription?: string;
  videoTags?: string[];
  videoCategories?: string[];
  videoKeywords?: string[];
}

const instagramPosts: InstagramPost[] = [
  {
    id: 1,
    image: "/assets/images/instagram/insta_image_1.webp",
    likes: 254,
  },
  {
    id: 2,
    image: "/assets/images/instagram/insta_image_3.webp", 
    likes: 187,
  },
  {
    id: 3,
    image: "/assets/images/instagram/insta_image_2.webp",
    likes: 315,
  },
  {
    id: 4,
    image: "/assets/images/instagram/insta_image_4.webp",
    likes: 201,
  },
];

const ImageWithFallback = ({ src, alt }: { src: string; alt: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use fallback to jpg if webp fails
  const fallbackSrc = src.replace('.webp', '.jpg');

  return (
    <div className="relative w-full h-full">
      {error ? (
        <img 
          src={fallbackSrc} 
          alt={alt} 
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => {
            // If fallback also fails, show placeholder
            const placeholder = document.createElement('div');
            placeholder.className = "bg-beige-100 w-full h-full flex items-center justify-center text-stone-500 text-sm";
            placeholder.textContent = "Image non disponible";
          }}
        />
      ) : (
        <>
          <img 
            src={src} 
            alt={alt} 
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            style={{ opacity: loading ? 0 : 1 }}
            onError={() => setError(true)} 
            onLoad={() => setLoading(false)}
            loading="lazy"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {loading && (
            <div className="absolute inset-0 bg-beige-100 animate-pulse" />
          )}
        </>
      )}
    </div>
  );
};

const InstagramFeed = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {instagramPosts.map((post) => (
        <a
          key={post.id}
          href="#"
          className="block relative group overflow-hidden rounded-md aspect-square"
        >
          <ImageWithFallback
            src={post.image}
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
