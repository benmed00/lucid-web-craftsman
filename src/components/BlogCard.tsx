
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
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300">
      <div className="aspect-w-16 aspect-h-9 w-full overflow-hidden">
        <BlogImage
          src={post.image}
          alt={post.title}
          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-6">
        <div className="flex items-center text-sm text-stone-500 mb-3">
          <span>{post.date}</span>
          <span className="mx-2">•</span>
          <span>{post.category}</span>
        </div>
        <Link to={`/blog/${post.id}`}>
          <h3 className="font-serif text-xl font-medium text-stone-800 mb-3 hover:text-olive-700 transition-colors">
            {post.title}
          </h3>
        </Link>
        <p className="text-stone-600 line-clamp-3">{post.excerpt}</p>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
        <span className="text-sm font-medium text-stone-600">{post.author}</span>
        <Link to={`/blog/${post.id}`}>
          <Button variant="ghost" className="text-olive-700 hover:text-olive-900 p-0">
            Lire la suite <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;
