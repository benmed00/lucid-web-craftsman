interface SocialMediaPost {
  id: number;
  media: {
    type: "image" | "video";
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  metrics: {
    likes: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  metadata?: {
    author?: string;
    location?: string;
    timestamp?: string;
    hashtags?: string[];
    caption?: string;
  };
}
export default SocialMediaPost;
