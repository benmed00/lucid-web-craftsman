
// File_name: src/pages/Blog.tsx

import { CalendarIcon, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";

import { getBlogPosts } from "@/api/mockApiService";
import { getImageUrl } from "@/utils/imageUtils";
import { IBlogPost } from "@/shared/interfaces/IBlogPost";

const Blog = () => {
  const [featuredPosts, setFeaturedPosts] = useState<IBlogPost[]>([]);
  const [regularPosts, setRegularPosts] = useState<IBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchPosts: () => Promise<void> = async () => {
      try {
        const posts: IBlogPost[] = await getBlogPosts();
        setFeaturedPosts(posts.filter(post => post.featured));
        setRegularPosts(posts.filter(post => !post.featured));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
        setLoading(false);
      }
    };
    
    void fetchPosts();
  }, [getBlogPosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            <p>Chargement des articles...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Page Header */}
      <div className="bg-beige-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
              Notre Blog
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">
              Journal de l'Artisanat
            </h1>
            <p className="text-stone-600 md:text-lg">
              Découvrez les histoires derrière nos créations, rencontrez nos
              artisans, et plongez dans la richesse de l'artisanat marocain.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl text-stone-800 mb-8">
              Articles à la Une
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="overflow-hidden border-none shadow-md hover-scale"
                >
                  <div className="aspect-ratio aspect-w-1 aspect-h-1 md:aspect-w-16 md:aspect-h-9">
                    <img
                      src={getImageUrl(post.image)}
                      alt={post.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-sm text-stone-500 mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" /> {post.date}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" /> {post.author}
                      </div>
                    </div>

                    <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
                      {post.category}
                    </Badge>

                    <h3 className="font-serif text-2xl text-stone-800 mb-3">
                      {post.title}
                    </h3>
                    <p className="text-stone-600 mb-6">{post.excerpt}</p>

                    <Link to={`/blog/${post.id}`}>
                      <Button
                        variant="outline"
                        className="border-olive-300 hover:bg-olive-50 hover:text-olive-800"
                      >
                        Lire la suite
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
      <section className="py-16 bg-stone-50">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl text-stone-800 mb-8">
            Derniers Articles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden border-none shadow-sm hover-scale"
              >
                <div className="aspect-ratio aspect-w-1 aspect-h-1 md:aspect-w-4 md:aspect-h-3">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-xs text-stone-500 mb-3">
                    <div className="flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" /> {post.date}
                    </div>
                  </div>

                  <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none text-xs">
                    {post.category}
                  </Badge>

                  <h3 className="font-serif text-xl text-stone-800 mb-3">
                    {post.title}
                  </h3>
                  <p className="text-stone-600 text-sm mb-6">{post.excerpt}</p>

                  <Link to={`/blog/${post.id}`}>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-olive-700 hover:text-olive-900"
                    >
                      Lire la suite
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-16 bg-olive-700 rounded-lg p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="font-serif text-2xl text-white mb-3">
                Abonnez-vous à notre newsletter
              </h3>
              <p className="text-olive-100 mb-6">
                Ne manquez aucun article, recevez nos dernières histoires et
                nouvelles collections directement dans votre boîte mail.
              </p>

              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Votre adresse email"
                  className="flex-grow px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-300"
                />
                <Button className="bg-olive-900 hover:bg-olive-950 text-white">
                  S'abonner
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default Blog;
