
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Leaf, Instagram, ShoppingBag } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductShowcase from "@/components/ProductShowcase";
import Testimonials from "@/components/Testimonials";
import InstagramFeed from "@/components/InstagramFeed";
import { Link } from "react-router-dom";
import HeroImage from "@/components/HeroImage";
import ScrollToTop from "@/components/ScrollToTop";

const Index = () => {
  console.log("Index component is rendering");
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-28">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="md:w-1/2 order-2 md:order-1 animate-fade-in-up">
            <div className="space-y-6">
              <Badge className="inline-flex items-center bg-olive-100 text-olive-800 hover:bg-olive-200 border-none px-4 py-2 animate-slide-in-left">
                <span className="w-2 h-2 bg-olive-500 rounded-full mr-2"></span>
                Artisanat Durable & Fait Main
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-stone-800 leading-tight">
                Créé avec amour dans les 
                <span className="text-olive-700 block">montagnes du Rif</span>
              </h1>
              <p className="text-lg md:text-xl text-stone-600 leading-relaxed max-w-xl">
                Découvrez notre collection de sacs et chapeaux fabriqués à la main, créés avec des matériaux durables et un savoir-faire traditionnel marocain transmis de génération en génération.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/products">
                  <Button className="bg-olive-700 hover:bg-olive-800 text-white font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift focus-ring text-lg">
                    Découvrir la Collection 
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/blog">
                  <Button variant="outline" className="border-2 border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-olive-300 px-8 py-6 rounded-lg font-medium hover-lift focus-ring text-lg transition-all duration-300">
                    Notre Histoire
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 order-1 md:order-2 animate-scale-in">
            <HeroImage />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="bg-beige-50 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <Badge className="mb-4 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none px-4 py-2">
              Nos Valeurs
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl text-stone-800 mb-6 leading-tight">
              Pourquoi Choisir Nos Créations?
            </h2>
            <p className="text-lg md:text-xl text-stone-600 leading-relaxed">
              Nos produits sont fabriqués avec amour, soin et engagement envers des pratiques durables
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 stagger-animation">
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Leaf className="h-8 w-8 text-olive-700" />
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center">Matériaux Écologiques</h3>
                <p className="text-stone-600 text-center leading-relaxed">
                  Tous nos produits sont fabriqués à partir de matériaux durables et éthiques, respectueux de l'environnement et des traditions locales.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="h-8 w-8 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center">Artisanat Traditionnel</h3>
                <p className="text-stone-600 text-center leading-relaxed">
                  Chaque pièce est soigneusement fabriquée par des artisans qualifiés utilisant des techniques traditionnelles transmises de génération en génération.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="h-8 w-8 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center">Designs Uniques</h3>
                <p className="text-stone-600 text-center leading-relaxed">
                  Nos designs allient esthétique moderne et influences traditionnelles, pour des pièces intemporelles qui racontent une histoire.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Showcase */}
      <section id="shop" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none px-4 py-2">
                Collection Artisanale
              </Badge>
              <h2 className="font-serif text-3xl md:text-5xl text-stone-800 mb-4 leading-tight">
                Nos Produits Phares
              </h2>
              <p className="text-lg text-stone-600">
                Chaque création raconte l'histoire de nos artisans et perpétue un savoir-faire ancestral
              </p>
            </div>
            <Link to="/products" className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors font-medium">
              Voir Toute la Collection 
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          <ProductShowcase />
          <div className="mt-12 text-center md:hidden">
            <Link to="/products">
              <Button variant="outline" className="border-2 border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-olive-300 px-8 py-4 rounded-lg font-medium">
                Voir Tous les Produits 
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-beige-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Témoignages</Badge>
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Ce Que Disent Nos Clients</h2>
          </div>
          <Testimonials />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="flex items-center justify-center mb-2">
              <Instagram className="h-5 w-5 text-stone-700 mr-2" />
              <span className="text-stone-700 font-medium">Suivez-nous @artisan_maroc</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Laissez-vous Inspirer par Notre Communauté</h2>
          </div>
          <InstagramFeed />
        </div>
      </section>

      <section className="bg-olive-700 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl text-white mb-4">Rejoignez Notre Newsletter</h2>
            <p className="text-olive-100 mb-8">Inscrivez-vous pour recevoir des mises à jour sur les nouveaux produits, les offres spéciales et les histoires de nos artisans.</p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Votre adresse email" 
                className="flex-grow px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-300 transition-all duration-200"
              />
              <Button className="bg-olive-900 hover:bg-olive-950 text-white hover-lift focus-ring">
                S'abonner
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
