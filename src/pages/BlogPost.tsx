import { CalendarIcon, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageFooter from "@/components/PageFooter";
import BlogContent from "@/components/BlogContent";
import { useBlogPostWithTranslation } from "@/hooks/useTranslatedContent";

const BlogPost = () => {
  const { t, i18n } = useTranslation("pages");
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Get date-fns locale based on current language
  const dateLocale = i18n.language?.startsWith('fr') ? fr : enUS;

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Fetch post by ID using translated content hook (supports UUID)
  const { data: post, isLoading, error } = useBlogPostWithTranslation(id || null);

  // Redirect if post not found
  useEffect(() => {
    if (!isLoading && !error && !post) {
      navigate("/blog");
    }
  }, [post, isLoading, error, navigate]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">{t("blogPost.loading")}</div>;
  }
  
  if (error || !post) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">{t("blogPost.notFound")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Article Header */}
      <div className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-primary hover:text-primary/80 mb-6"
          >
            ← {t("blogPost.backToArticles")}
          </Link>
          
          <div className="max-w-3xl mx-auto">
            {post.tags && post.tags[0] && (
              <Badge className="mb-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-none">
                {post.tags[0]}
              </Badge>
            )}
            <h1 className="font-serif text-3xl md:text-5xl text-foreground mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-6">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" /> {formatDate(post.published_at)}
              </div>
              {post.author_id && (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" /> {t("blog.author")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="aspect-w-16 aspect-h-9 mb-8">
            <img
              src={post.featured_image_url || '/placeholder.svg'}
              alt={post.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* Dynamic content from database or fallback to excerpt */}
          {post.content ? (
            <>
              <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>
              <BlogContent content={post.content} />
            </>
          ) : (
            <div className="prose prose-stone dark:prose-invert lg:prose-lg max-w-none">
              <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>
              
              <p className="text-foreground mb-6">
                {t("blogPost.content.intro1")}
              </p>

              <p className="text-foreground mb-6">
                {t("blogPost.content.intro2")}
              </p>

              <h2 className="text-2xl font-serif mt-8 mb-4 text-foreground">{t("blogPost.content.heading1")}</h2>

              <p className="text-foreground mb-6">
                {t("blogPost.content.paragraph1")}
              </p>

              <p className="text-foreground mb-6">
                {t("blogPost.content.paragraph2")}
              </p>

              <h2 className="text-2xl font-serif mt-8 mb-4 text-foreground">{t("blogPost.content.heading2")}</h2>

              <p className="text-foreground mb-6">
                {t("blogPost.content.paragraph3")}
              </p>

              <p className="text-foreground">
                {t("blogPost.content.paragraph4")}
              </p>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 mb-6">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="capitalize">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="border-t border-border mt-12 pt-6">
            <p className="text-muted-foreground mb-3">{t("blogPost.shareArticle")}</p>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className="border-border hover:bg-muted">
                Facebook
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-muted">
                Twitter
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-muted">
                LinkedIn
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default BlogPost;
