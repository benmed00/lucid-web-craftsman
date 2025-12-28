
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BlogImage } from "@/components/ui/GlobalImage";

interface BlogCardProps {
  post: {
    id: number;
    title: string;
    excerpt: string;
    image: string;
    date: string;
    author: string;
    category: string;
  };
}

const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Card 
      className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300"
      role="article"
      aria-labelledby={`blog-title-${post.id}`}
      aria-describedby={`blog-excerpt-${post.id}`}
    >
      <div className="aspect-w-16 aspect-h-9 w-full overflow-hidden">
        <BlogImage
          src={post.image}
          alt={`Image de l'article: ${post.title}`}
          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-6">
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <time dateTime={post.date}>{post.date}</time>
          <span className="mx-2" aria-hidden="true">•</span>
          <span className="text-muted-foreground">{post.category}</span>
        </div>
        <Link to={`/blog/${post.id}`} aria-label={`Lire l'article complet: ${post.title}`}>
          <h3 
            id={`blog-title-${post.id}`}
            className="font-serif text-xl font-medium text-foreground mb-3 hover:text-primary transition-colors"
          >
            {post.title}
          </h3>
        </Link>
        <p 
          id={`blog-excerpt-${post.id}`}
          className="text-muted-foreground line-clamp-3"
        >
          {post.excerpt}
        </p>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Par {post.author}</span>
        <Link to={`/blog/${post.id}`} aria-label={`Lire la suite de l'article: ${post.title}`}>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 p-0"
            aria-label={`Continuer la lecture: ${post.title}`}
          >
            Lire la suite <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;
