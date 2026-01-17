import { CalendarIcon, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SEOHelmet from "@/components/seo/SEOHelmet";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import PageFooter from "@/components/PageFooter";
import { getBlogPosts } from "@/api/mockApiService";
import { BlogImage } from "@/components/ui/GlobalImage";
import BlogSkeleton from "@/components/BlogSkeleton";
import NewsletterSubscription from "@/components/NewsletterSubscription";

const Blog = () => {
  const { t } = useTranslation("pages");
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [regularPosts, setRegularPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchPosts = async () => {
      try {
        const posts = await getBlogPosts();
        setFeaturedPosts(posts.filter(post => post.featured));
        setRegularPosts(posts.filter(post => !post.featured));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <>
        <BlogSkeleton />
        <PageFooter />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title={t("blog.seo.title")}
        description={t("blog.seo.description")}
        keywords={t("blog.seo.keywords", { returnObjects: true }) as string[]}
        url="/blog"
        type="website"
      />
      

      {/* Page Header */}
      <div className="bg-secondary py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-none">
              {t("blog.badge")}
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              {t("blog.heading")}
            </h1>
            <p className="text-muted-foreground md:text-lg">
              {t("blog.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl text-foreground mb-8">
              {t("blog.featured")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="overflow-hidden border-none shadow-md hover-scale bg-card"
                >
                  <div className="aspect-ratio aspect-w-1 aspect-h-1 md:aspect-w-16 md:aspect-h-9">
                    <BlogImage
                      src={post.image}
                      alt={post.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" /> {post.date}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" /> {post.author}
                      </div>
                    </div>

                    <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      {post.category}
                    </Badge>

                    <h3 className="font-serif text-2xl text-foreground mb-3">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-6">{post.excerpt}</p>

                    <Link to={`/blog/${post.id}`}>
                      <Button
                        variant="outline"
                        className="border-border hover:bg-muted hover:text-foreground"
                      >
                        {t("blog.readMore")}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl text-foreground mb-8">
            {t("blog.latest")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden border-none shadow-sm hover-scale bg-card"
              >
                <div className="aspect-ratio aspect-w-1 aspect-h-1 md:aspect-w-4 md:aspect-h-3">
                  <BlogImage
                    src={post.image}
                    alt={post.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" /> {post.date}
                    </div>
                  </div>

                  <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-none text-xs">
                    {post.category}
                  </Badge>

                  <h3 className="font-serif text-xl text-foreground mb-3">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">{post.excerpt}</p>

                  <Link to={`/blog/${post.id}`}>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80"
                    >
                      {t("blog.readMore")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-16 bg-primary rounded-lg p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="font-serif text-2xl text-primary-foreground mb-3">
                {t("blog.newsletter.title")}
              </h3>
              <p className="text-primary-foreground/80 mb-6">
                {t("blog.newsletter.description")}
              </p>
              <NewsletterSubscription variant="inline" />
            </div>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default Blog;
