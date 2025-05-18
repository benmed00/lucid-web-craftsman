
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Leaf, Instagram, Star, ShoppingBag } from "lucide-react";
import HeroImage from "@/components/HeroImage";
import ProductShowcase from "@/components/ProductShowcase";
import Testimonials from "@/components/Testimonials";
import InstagramFeed from "@/components/InstagramFeed";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Leaf className="h-6 w-6 text-olive-600" />
          <span className="font-serif text-2xl font-medium text-stone-800">Artisan</span>
        </div>
        <div className="hidden md:flex space-x-6">
          <a href="#" className="text-stone-700 hover:text-stone-900 transition-colors">Home</a>
          <a href="#shop" className="text-stone-700 hover:text-stone-900 transition-colors">Shop</a>
          <a href="#about" className="text-stone-700 hover:text-stone-900 transition-colors">About</a>
          <a href="#testimonials" className="text-stone-700 hover:text-stone-900 transition-colors">Testimonials</a>
        </div>
        <Button variant="outline" className="hidden md:flex border-stone-300 text-stone-700 hover:bg-stone-50">
          <ShoppingBag className="mr-2 h-4 w-4" /> Cart (0)
        </Button>
        <button className="md:hidden text-stone-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
          <Badge className="mb-4 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Sustainable & Handmade</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-stone-800 mb-6">Handcrafted with love and purpose</h1>
          <p className="text-lg text-stone-600 mb-8">Discover our collection of handmade bags and hats, created with sustainable materials and traditional craftsmanship.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="bg-olive-700 hover:bg-olive-800 text-white font-medium px-8 py-6 rounded-md">
              Shop Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50 px-8 py-6 rounded-md">
              Our Story
            </Button>
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
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800 mb-4">Why Choose Our Creations?</h2>
            <p className="text-lg text-stone-600">Our products are made with love, care, and commitment to sustainable practices</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <Leaf className="h-6 w-6 text-olive-700" />
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Eco-friendly Materials</h3>
                <p className="text-stone-600">All our products are made using sustainable, ethically sourced materials that are kind to the environment.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Handmade Craftsmanship</h3>
                <p className="text-stone-600">Every piece is carefully crafted by skilled artisans using traditional techniques passed down through generations.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardContent className="p-6">
                <div className="h-12 w-12 bg-olive-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif text-stone-800 mb-2">Unique Designs</h3>
                <p className="text-stone-600">Our designs combine modern aesthetics with traditional influences, resulting in timeless pieces that stand out.</p>
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
              <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Handcrafted Collection</Badge>
              <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Our Featured Products</h2>
            </div>
            <a href="#" className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
          <ProductShowcase />
          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50">
              View All Products <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-beige-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">Testimonials</Badge>
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800">What Our Customers Say</h2>
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
              <span className="text-stone-700 font-medium">Follow Us @artisan_craft</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-stone-800">Get Inspired by Our Community</h2>
          </div>
          <InstagramFeed />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-olive-700 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl text-white mb-4">Join Our Newsletter</h2>
            <p className="text-olive-100 mb-8">Sign up to receive updates on new products, special offers, and stories from our artisans.</p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-300"
              />
              <Button className="bg-olive-900 hover:bg-olive-950 text-white">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
