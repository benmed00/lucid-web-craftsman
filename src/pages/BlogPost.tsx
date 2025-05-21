
import { CalendarIcon, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { blogPosts } from "@/data/blogPosts";

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Find post by ID
    const postId = parseInt(id);
    const foundPost = blogPosts.find((post) => post.id === postId);
    
    if (foundPost) {
      setPost(foundPost);
    } else {
      // Redirect to blog list if post not found
      navigate("/blog");
    }
  }, [id, navigate]);

  if (!post) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Article Header */}
      <div className="bg-beige-50 py-16">
        <div className="container mx-auto px-4">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-olive-700 hover:text-olive-900 mb-6"
          >
            ← Retour aux articles
          </Link>
          
          <div className="max-w-3xl mx-auto">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
              {post.category}
            </Badge>
            <h1 className="font-serif text-3xl md:text-5xl text-stone-800 mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-stone-500 mt-6">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" /> {post.date}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" /> {post.author}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="aspect-w-16 aspect-h-9 mb-8">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          <div className="prose prose-stone lg:prose-lg max-w-none">
            <p className="text-lg text-stone-700 mb-6">{post.excerpt}</p>
            
            <p className="text-stone-700 mb-6">
              L'artisanat marocain est une richesse culturelle inestimable, transmise de génération en génération. 
              Dans les montagnes du Rif, les techniques ancestrales de tissage et de tressage sont préservées 
              avec soin par des communautés locales qui perpétuent un savoir-faire unique.
            </p>

            <p className="text-stone-700 mb-6">
              Chaque pièce raconte une histoire et porte en elle l'âme de l'artisan qui l'a créée. 
              Les motifs géométriques et les symboles berbères utilisés dans nos créations sont imprégnés 
              de significations et représentent une forme de communication visuelle ancrée dans la tradition.
            </p>

            <h2 className="text-2xl font-serif mt-8 mb-4">La tradition au service de la modernité</h2>

            <p className="text-stone-700 mb-6">
              Aujourd'hui, ces techniques ancestrales s'adaptent aux besoins contemporains tout en 
              préservant l'authenticité qui fait leur valeur. Nos artisans combinent leur expertise 
              traditionnelle avec des designs modernes pour créer des pièces à la fois intemporelles et actuelles.
            </p>

            <p className="text-stone-700 mb-6">
              En soutenant notre coopérative, vous contribuez directement à la préservation de ce 
              patrimoine culturel immatériel et à l'autonomisation économique des communautés artisanales du Rif.
            </p>

            <h2 className="text-2xl font-serif mt-8 mb-4">Un impact social et environnemental</h2>

            <p className="text-stone-700 mb-6">
              Notre engagement ne se limite pas à la qualité de nos produits. Nous veillons également 
              à ce que chaque étape de production respecte l'environnement en utilisant des matériaux naturels 
              et des techniques à faible impact écologique.
            </p>

            <p className="text-stone-700">
              Les artisans qui collaborent avec nous bénéficient de conditions de travail justes et d'une 
              rémunération équitable, permettant ainsi de soutenir l'économie locale tout en préservant un 
              savoir-faire unique au monde.
            </p>
          </div>

          {/* Share Buttons */}
          <div className="border-t border-stone-200 mt-12 pt-6">
            <p className="text-stone-600 mb-3">Partager cet article :</p>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className="border-stone-300 hover:bg-stone-50">
                Facebook
              </Button>
              <Button variant="outline" size="sm" className="border-stone-300 hover:bg-stone-50">
                Twitter
              </Button>
              <Button variant="outline" size="sm" className="border-stone-300 hover:bg-stone-50">
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
