
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";

// Mock blog data
const blogPosts = [
  {
    id: 1,
    title: "L'art du tissage traditionnel dans les montagnes du Rif",
    excerpt: "Découvrez comment les artisans transmettent leurs techniques de génération en génération tout en adaptant leur savoir-faire aux tendances modernes.",
    image: "https://images.unsplash.com/photo-1528295674080-a35f6cb713b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "14 Mai 2025",
    author: "Layla Nakouri",
    category: "Artisanat",
    featured: true
  },
  {
    id: 2,
    title: "Matériaux naturels : la beauté des fibres végétales",
    excerpt: "Quels sont les matériaux utilisés dans la confection de nos sacs et chapeaux? Une exploration des fibres locales et durables que nous privilégions.",
    image: "https://images.unsplash.com/photo-1575383719878-709fd65e8f65?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "28 Avril 2025",
    author: "Thomas Dubois",
    category: "Durabilité"
  },
  {
    id: 3,
    title: "Rencontre avec Amina, maître artisane depuis 40 ans",
    excerpt: "Le portrait touchant d'une des plus anciennes artisanes de notre coopérative, qui perpétue un savoir-faire ancestral avec passion et dévouement.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "10 Avril 2025",
    author: "Sophie Laurent",
    category: "Portraits",
    featured: true
  },
  {
    id: 4,
    title: "Les symboles berbères dans nos créations",
    excerpt: "Chaque motif raconte une histoire. Découvrez la signification des symboles ancestraux que vous retrouvez sur nos créations artisanales.",
    image: "https://images.unsplash.com/photo-1590047265362-489bb0b8802c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "2 Avril 2025",
    author: "Mehdi Alaoui",
    category: "Culture"
  },
  {
    id: 5,
    title: "Comment entretenir votre sac en fibres naturelles",
    excerpt: "Nos conseils d'experts pour préserver la beauté et prolonger la durée de vie de vos accessoires artisanaux en fibres naturelles.",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "15 Mars 2025",
    author: "Claire Dubois",
    category: "Conseils"
  },
  {
    id: 6,
    title: "Notre engagement pour un commerce équitable",
    excerpt: "Comment nous assurons des conditions de travail justes et une rémunération équitable pour tous les artisans qui collaborent avec notre marque.",
    image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "28 Février 2025",
    author: "Jean Martin",
    category: "Éthique"
  }
];

// Extract featured posts
const featuredPosts = blogPosts.filter(post => post.featured);
const regularPosts = blogPosts.filter(post => !post.featured);

const Blog = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Page Header */}
      <div className="bg-beige-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Notre Blog</Badge>
            <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">Journal de l'Artisanat</h1>
            <p className="text-stone-600 md:text-lg">
              Découvrez les histoires derrière nos créations, rencontrez nos artisans, 
              et plongez dans la richesse de l'artisanat marocain.
            </p>
          </div>
        </div>
      </div>
      
      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl text-stone-800 mb-8">Articles à la Une</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden border-none shadow-md hover-scale">
                  <div className="aspect-ratio aspect-w-1 aspect-h-1 md:aspect-w-16 md:aspect-h-9">
                    <img 
                      src={post.image} 
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
                    
                    <h3 className="font-serif text-2xl text-stone-800 mb-3">{post.title}</h3>
                    <p className="text-stone-600 mb-6">{post.excerpt}</p>
                    
                    <Link to={`/blog/${post.id}`}>
                      <Button variant="outline" className="border-olive-300 hover:bg-olive-50 hover:text-olive-800">
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
          <h2 className="font-serif text-3xl text-stone-800 mb-8">Derniers Articles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden border-none shadow-sm hover-scale">
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
                  
                  <h3 className="font-serif text-xl text-stone-800 mb-3">{post.title}</h3>
                  <p className="text-stone-600 text-sm mb-6">{post.excerpt}</p>
                  
                  <Link to={`/blog/${post.id}`}>
                    <Button variant="link" className="p-0 h-auto text-olive-700 hover:text-olive-900">
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
                Ne manquez aucun article, recevez nos dernières histoires et nouvelles collections directement dans votre boîte mail.
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
