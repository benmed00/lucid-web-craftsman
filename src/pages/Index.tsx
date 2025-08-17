
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Leaf, Instagram } from "lucide-react"; // Removed ShoppingBag
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductShowcase from "@/components/ProductShowcase";
import Testimonials from "@/components/Testimonials";
import InstagramFeed from "@/components/InstagramFeed";
import { Link } from "react-router-dom";
import HeroImage from "@/components/HeroImage";
import ScrollToTop from "@/components/ScrollToTop";
import FloatingCartButton from "@/components/ui/FloatingCartButton";
import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { useState, useEffect } from "react";
import { getProducts } from "@/api/mockApiService";
import { Product } from "@/shared/interfaces/Iproduct.interface";

const Index = () => {
  console.log("Index component is rendering");
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await getProducts();
        setAllProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <Navigation />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-8 md:py-12 lg:py-24 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Left: Copy and CTA */}
          <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8 hero-text-animation text-center md:text-left">
            <Badge className="mb-4 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none animate-scale-in hover-glow">
              <span className="w-2 h-2 bg-olive-500 rounded-full mr-2"></span>
              Artisanat Durable & Fait Main
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-serif font-medium text-stone-800 mb-4 md:mb-6 animate-fade-in-up leading-tight">
              Créé avec amour dans les <span className="text-olive-700">montagnes du Rif</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-stone-600 mb-6 md:mb-8 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.3s' }}>
              Découvrez notre collection de sacs et chapeaux fabriqués à la main, créés avec des matériaux durables et un savoir-faire traditionnel marocain.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in-up w-full sm:w-auto" style={{ animationDelay: '0.5s' }}>
              <Link to="/products" className="group w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-olive-700 hover:bg-olive-800 text-white font-medium px-6 md:px-8 py-4 md:py-6 rounded-md transition-all duration-300 hover:scale-105 hover:shadow-lg button-press hover-glow text-base md:text-lg touch-manipulation min-h-[48px] md:min-h-[56px]">
                  Découvrir la Collection 
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/blog" className="group w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-stone-300 text-stone-700 hover:bg-stone-50 px-6 md:px-8 py-4 md:py-6 rounded-md transition-all duration-300 hover:scale-105 hover:border-olive-300 button-press text-base md:text-lg touch-manipulation min-h-[48px] md:min-h-[56px]">
                  Notre Histoire
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Hero image */}
          <div className="md:w-1/2 w-full hero-image-animation">
            <div className="transition-all duration-500">
              <HeroImage />
            </div>
          </div>
        </section>

      {/* Features Section */}
      <section id="about" className="bg-beige-50 py-12 md:py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 stagger-animation">
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8 hover-glow group">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Leaf className="h-8 w-8 text-olive-700 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center transition-colors duration-300 group-hover:text-olive-700">Matériaux Écologiques</h3>
                <p className="text-stone-600 text-center leading-relaxed transition-colors duration-300 group-hover:text-stone-700">
                  Tous nos produits sont fabriqués à partir de matériaux durables et éthiques, respectueux de l'environnement et des traditions locales.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8 hover-glow group">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <svg className="h-8 w-8 text-olive-700 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center transition-colors duration-300 group-hover:text-olive-700">Artisanat Traditionnel</h3>
                <p className="text-stone-600 text-center leading-relaxed transition-colors duration-300 group-hover:text-stone-700">
                  Chaque pièce est soigneusement fabriquée par des artisans qualifiés utilisant des techniques traditionnelles transmises de génération en génération.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-8 hover-glow group">
              <CardContent className="p-0">
                <div className="h-16 w-16 bg-olive-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <svg className="h-8 w-8 text-olive-700 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-4 text-center transition-colors duration-300 group-hover:text-olive-700">Designs Uniques</h3>
                <p className="text-stone-600 text-center leading-relaxed transition-colors duration-300 group-hover:text-stone-700">
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
            <Link to="/products" className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-all duration-300 font-medium group hover-underline icon-bounce">
              Voir Toute la Collection 
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <ProductShowcase />
          
          {/* Recently Viewed Section */}
          <div className="mt-16">
            <RecentlyViewedProducts />
          </div>

          {/* Recommendations Section */}
          <div className="mt-16">
            <ProductRecommendations
              allProducts={allProducts}
              title="Découvrir nos nouveautés"
              maxRecommendations={8}
            />
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link to="/products" className="group">
              <Button variant="outline" className="border-2 border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-olive-300 px-8 py-4 rounded-lg font-medium transition-all duration-300 hover:scale-105 button-press hover-glow">
                Voir Tous les Produits 
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
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
              <label htmlFor="newsletter-email-index" className="sr-only">Votre adresse email</label>
              <input 
                type="email"
                id="newsletter-email-index"
                placeholder="Votre adresse email" 
                className="flex-grow px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-300"
                aria-label="Adresse email pour la newsletter"
              />
              <Button type="submit" className="bg-olive-900 hover:bg-olive-950 text-white transition-all duration-300 hover:scale-105 button-press hover-glow">
                S'abonner
              </Button>
            </form>
          </div>
        </div>
      </section>
      </main>

      <Footer />
      <ScrollToTop />
      <FloatingCartButton />
    </div>
  );
};

export default Index;
