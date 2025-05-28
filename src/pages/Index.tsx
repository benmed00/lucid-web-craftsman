
import React, { useState } from "react";
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
import { ErrorBoundary } from "@/utils/ErrorBoundary";

const Index = () => {
  const [formState, setFormState] = useState({
    email: '',
    isSubmitting: false,
    error: '',
    success: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      email: e.target.value,
      error: '',
      success: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ ...formState, isSubmitting: true, error: '' });

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formState.email }),
      });

      if (!response.ok) {
        throw new Error('Une erreur est survenue lors de l\'inscription');
      }

      setFormState({
        email: '',
        isSubmitting: false,
        error: '',
        success: true
      });

      // Reset form after 5 seconds
      setTimeout(() => {
        setFormState({
          email: '',
          isSubmitting: false,
          error: '',
          success: false
        });
      }, 5000);
    } catch (error) {
      setFormState({
        ...formState,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    }
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
          <Badge className="mb-4 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Artisanat Durable & Fait Main</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-stone-800 mb-6">Créé avec amour dans les montagnes du Rif</h1>
          <p className="text-lg text-stone-600 mb-8">Découvrez notre collection de sacs et chapeaux fabriqués à la main, créés avec des matériaux durables et un savoir-faire traditionnel marocain.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/products">
              <Button className="bg-olive-700 hover:bg-olive-800 text-white font-medium px-8 py-6 rounded-md">
                Découvrir <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50 px-8 py-6 rounded-md">
                Notre Histoire
              </Button>
            </Link>
          </div>
        </div>
        <div className="md:w-1/2">
          <HeroImage />
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="bg-beige-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800 mb-4">Pourquoi Choisir Nos Créations?</h2>
            <p className="text-lg text-stone-600">Nos produits sont fabriqués avec amour, soin et engagement envers des pratiques durables</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <Leaf className="h-6 w-6 text-olive-700" />
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Matériaux Écologiques</h3>
                <p className="text-stone-600">Tous nos produits sont fabriqués à partir de matériaux durables et éthiques, respectueux de l'environnement.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Artisanat Traditionnel</h3>
                <p className="text-stone-600">Chaque pièce est soigneusement fabriquée par des artisans qualifiés utilisant des techniques traditionnelles transmises de génération en génération.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Designs Uniques</h3>
                <p className="text-stone-600">Nos designs allient esthétique moderne et influences traditionnelles, pour des pièces intemporelles qui se démarquent.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Showcase */}
      <section id="shop" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Collection Artisanale</Badge>
              <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Nos Produits Phares</h2>
            </div>
            <Link to="/products" className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors">
              Voir Tout <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <ProductShowcase />
          <div className="mt-8 text-center md:hidden">
            <Link to="/products">
              <Button variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50">
                Voir Tous les Produits <ArrowRight className="ml-2 h-4 w-4" />
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

      {/* Instagram Feed */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="flex items-center justify-center mb-2">
              <Instagram className="h-5 w-5 text-stone-700 mr-2" />
              <span className="text-stone-700 font-medium">Suivez-nous @artisan_maroc</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Laissez-vous Inspirer par Notre Communauté</h2>
          </div>
          <ErrorBoundary fallback={<p>Something went wrong</p>}>
            <InstagramFeed />
          </ErrorBoundary>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-olive-700 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl text-white mb-4">Rejoignez Notre Newsletter</h2>
            <p className="text-olive-100 mb-8">Inscrivez-vous pour recevoir des mises à jour sur les nouveaux produits, les offres spéciales et les histoires de nos artisans.</p>
            <div className="max-w-md mx-auto">
              <form 
                id="newsletter-form"
                className="flex flex-col sm:flex-row gap-3"
                onSubmit={handleSubmit}
              >
                <div className="flex-grow">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Votre adresse email
                  </label>
                  <input 
                    type="email" 
                    id="newsletter-email"
                    name="email"
                    autoComplete="email@gmail.com"
                    placeholder="Votre adresse email" 
                    className={`flex-grow px-4 py-3 rounded-md focus:outline-none ${
                      formState.error ? 'border-red-500 focus:ring-red-300' : 'focus:ring-2 focus:ring-olive-300'
                    }`}
                    required
                    aria-label="Votre adresse email"
                    aria-invalid={formState.error ? 'true' : 'false'}
                    aria-describedby="email-error"
                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    title="Veuillez entrer une adresse email valide"
                    value={formState.email}
                    onChange={handleChange}
                    disabled={formState.isSubmitting}
                  />
                  {formState.error && (
                    <p id="email-error" className="text-red-500 text-sm mt-1">
                      {formState.error}
                    </p>
                  )}
                </div>
                <Button 
                  type="submit"
                  className="bg-olive-900 hover:bg-olive-950 text-white"
                  disabled={formState.isSubmitting}
                >
                  {formState.isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      En cours...
                    </>
                  ) : (
                    'S\'abonner'
                  )}
                </Button>
              </form>
              {formState.success && (
                <div className="mt-3 p-3 rounded-md bg-green-50 text-green-700">
                  Merci pour votre inscription ! Vous recevrez bientôt des nouvelles de notre boutique.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
