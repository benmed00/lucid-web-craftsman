import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Send,
  MessageSquare,
  Package,
  User,
  Building,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { useEffect } from "react";
import { toast } from "sonner";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { validateAndSanitizeEmail, validateAndSanitizeName, sanitizeUserInput } from "@/utils/xssProtection";
import { createRateLimiter } from "@/utils/validation";
import { supabase } from "@/integrations/supabase/client";

// Rate limiter for contact form submissions
const contactRateLimiter = createRateLimiter(3, 10 * 60 * 1000); // 3 attempts per 10 minutes

const Contact = () => {
  // Form states
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const csrfToken = useCsrfToken();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    const clientId = navigator.userAgent + window.location.hostname;
    if (!contactRateLimiter(clientId)) {
      toast.error("Trop de soumissions. Veuillez attendre 10 minutes avant de réessayer.");
      return;
    }

    // Validation and sanitization
    try {
      const sanitizedData = {
        firstName: validateAndSanitizeName(contactForm.firstName),
        lastName: validateAndSanitizeName(contactForm.lastName),
        email: validateAndSanitizeEmail(contactForm.email),
        phone: sanitizeUserInput(contactForm.phone),
        company: sanitizeUserInput(contactForm.company),
        subject: sanitizeUserInput(contactForm.subject.trim()),
        message: sanitizeUserInput(contactForm.message.trim())
      };

      if (sanitizedData.subject.length < 5) {
        throw new Error("Le sujet doit contenir au moins 5 caractères");
      }

      if (sanitizedData.message.length < 20) {
        throw new Error("Le message doit contenir au moins 20 caractères");
      }

      setIsSubmitting(true);
      
      // Submit to Supabase edge function
      const supabaseUrl = 'https://xcvlijchkmhjonhfildm.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(sanitizedData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur de communication' }));
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du message');
      }
      
      toast.success("Message envoyé avec succès! Nous vous répondrons bientôt.");
      
      // Reset form
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: ''
      });

    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-stone-100">
      <Navigation />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-olive-600 to-olive-800 text-white py-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-6xl mb-6 leading-tight">
              PROFITEER/VANK/HICORIA/HLD\FISS
            </h1>
            <p className="text-xl md:text-2xl text-olive-100 mb-8 leading-relaxed">
              Questions pertinentes et d'expertise. Contrôlez vos questions.
              Solutions développées commerciales spécialisées à l'entreprise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        size="lg" 
                        className="bg-olive-700 text-white hover:bg-olive-800 px-8 py-3 text-lg font-semibold"
                        id="contact-hero-button"
                        name="start-contact-discussion"
                      >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Démarrer une Discussion
                      </Button>
            </div>
          </div>
        </div>

        {/* Decorative floating cards */}
        <div className="absolute top-10 left-10 transform rotate-12 opacity-80 hidden lg:block">
          <Card className="w-64 shadow-xl">
            <CardContent className="p-4">
              <h3 className="font-semibold text-stone-800 mb-2">Contact Général</h3>
              <p className="text-sm text-stone-600">Questions sur nos produits artisanaux</p>
            </CardContent>
          </Card>
        </div>

        <div className="absolute top-32 right-16 transform -rotate-6 opacity-80 hidden lg:block">
          <Card className="w-56 shadow-xl">
            <CardContent className="p-4">
              <h3 className="font-semibold text-stone-800 mb-2">Support Technique</h3>
              <p className="text-sm text-stone-600">Aide pour vos commandes</p>
            </CardContent>
          </Card>
        </div>

        <div className="absolute bottom-10 left-1/4 transform rotate-3 opacity-80 hidden lg:block">
          <Card className="w-48 shadow-xl">
            <CardContent className="p-4">
              <h3 className="font-semibold text-stone-800 mb-2">Partenariats</h3>
              <p className="text-sm text-stone-600">Collaborations commerciales</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Contact Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              
              {/* Left Sidebar - Contact Info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="font-serif text-3xl text-stone-800 mb-6">Nous Contacter</h2>
                  <p className="text-stone-600 text-lg leading-relaxed">
                    Notre équipe d'experts est là pour vous accompagner dans tous vos projets 
                    d'artisanat berbère authentique.
                  </p>
                </div>

                {/* Contact Information Cards */}
                <div className="space-y-4">
                  <Card className="border-l-4 border-l-olive-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-olive-100 rounded-lg">
                          <Mail className="h-6 w-6 text-olive-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800 mb-2">Email</h3>
                          <p className="text-stone-600">contact@rifstraw.com</p>
                          <p className="text-sm text-stone-500">Réponse sous 24h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-olive-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-olive-100 rounded-lg">
                          <Phone className="h-6 w-6 text-olive-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800 mb-2">Téléphone</h3>
                          <p className="text-stone-600">+33 1 23 45 67 89</p>
                          <p className="text-sm text-stone-500">Lun-Ven 9h-18h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-olive-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-olive-100 rounded-lg">
                          <MapPin className="h-6 w-6 text-olive-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800 mb-2">Adresse</h3>
                          <p className="text-stone-600">123 Rue de l'Artisan</p>
                          <p className="text-stone-600">75001 Paris, France</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-olive-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-olive-100 rounded-lg">
                          <Clock className="h-6 w-6 text-olive-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800 mb-2">Horaires</h3>
                          <p className="text-stone-600">Lundi - Vendredi: 9h - 18h</p>
                          <p className="text-stone-600">Samedi: 10h - 16h</p>
                          <p className="text-stone-600">Dimanche: Fermé</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Services Section */}
                <div className="bg-olive-50 rounded-xl p-6">
                  <h3 className="font-serif text-xl text-stone-800 mb-4">Nos Services</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-olive-600" />
                      <span className="text-stone-700">Commandes personnalisées</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-olive-600" />
                      <span className="text-stone-700">Conseil d'expert</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-olive-600" />
                      <span className="text-stone-700">Solutions B2B</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-olive-600" />
                      <span className="text-stone-700">Livraison internationale</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="lg:col-span-3">
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-olive-600 to-olive-700 p-6">
                    <h2 className="font-serif text-2xl text-white mb-2">Envoyez-nous un Message</h2>
                    <p className="text-olive-100">Nous répondons généralement sous 2-4 heures</p>
                  </div>
                  
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <input type="hidden" name="csrf_token" value={csrfToken} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-stone-700 font-medium">
                            Prénom *
                          </Label>
                          <Input
                            id="firstName"
                            name="contact-first-name"
                            placeholder="Votre prénom"
                            value={contactForm.firstName}
                            onChange={(e) => setContactForm(prev => ({...prev, firstName: e.target.value}))}
                            required
                            maxLength={50}
                            className="border-stone-300 focus:border-olive-500 focus:ring-olive-500/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-stone-700 font-medium">
                            Nom *
                          </Label>
                          <Input 
                            id="lastName"
                            name="contact-last-name"
                            placeholder="Votre nom"
                            value={contactForm.lastName}
                            onChange={(e) => setContactForm(prev => ({...prev, lastName: e.target.value}))}
                            required
                            maxLength={50}
                            className="border-stone-300 focus:border-olive-500 focus:ring-olive-500/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-stone-700 font-medium">
                            Email *
                          </Label>
                          <Input
                            id="email"
                            name="contact-email"
                            type="email"
                            placeholder="votre.email@exemple.com"
                            value={contactForm.email}
                            onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                            required
                            maxLength={255}
                            className="border-stone-300 focus:border-olive-500 focus:ring-olive-500/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-stone-700 font-medium">
                            Téléphone
                          </Label>
                          <Input
                            id="phone"
                            name="contact-phone"
                            placeholder="Votre numéro de téléphone"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm(prev => ({...prev, phone: e.target.value}))}
                            maxLength={20}
                            className="border-stone-300 focus:border-olive-500 focus:ring-olive-500/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-stone-700 font-medium">
                          Entreprise (optionnel)
                        </Label>
                        <Input
                          id="company"
                          name="contact-company"
                          placeholder="Nom de votre entreprise"
                          value={contactForm.company}
                          onChange={(e) => setContactForm(prev => ({...prev, company: e.target.value}))}
                          maxLength={100}
                          className="border-stone-300 focus:border-olive-500 focus:ring-olive-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-stone-700 font-medium">
                          Sujet *
                        </Label>
                        <select
                          id="subject"
                          name="contact-subject"
                          className="w-full h-11 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-olive-500 focus:ring-2 focus:ring-olive-500/20 bg-white"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm(prev => ({...prev, subject: e.target.value}))}
                          required
                        >
                          <option value="">Sélectionnez un sujet</option>
                          <option value="product">Question sur un produit</option>
                          <option value="custom-order">Commande personnalisée</option>
                          <option value="partnership">Partenariat commercial</option>
                          <option value="wholesale">Vente en gros</option>
                          <option value="shipping">Livraison et expédition</option>
                          <option value="support">Support technique</option>
                          <option value="other">Autre question</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-stone-700 font-medium">
                          Message *
                        </Label>
                        <textarea
                          id="message"
                          name="contact-message"
                          rows={6}
                          placeholder="Décrivez votre demande en détail..."
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({...prev, message: e.target.value}))}
                          className="w-full px-3 py-3 text-base border border-stone-300 rounded-md focus:outline-none focus:border-olive-500 focus:ring-2 focus:ring-olive-500/20 resize-none"
                          required
                          maxLength={2000}
                        ></textarea>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-stone-500">
                            {contactForm.message.length}/2000 caractères
                          </p>
                          <p className="text-xs text-stone-400">
                            Minimum 20 caractères requis
                          </p>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                        id="contact-form-submit"
                        name="submit-contact-message"
                      >
                        <Send className="h-5 w-5" />
                        {isSubmitting ? "Envoi en cours..." : "Envoyer le Message"}
                      </Button>
                      
                      <div className="text-center pt-4">
                        <p className="text-sm text-stone-500 leading-relaxed">
                          En soumettant ce formulaire, vous acceptez que nous traitions vos données 
                          conformément à notre politique de confidentialité.
                        </p>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-stone-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="font-serif text-3xl text-stone-800 mb-4">Notre Localisation</h2>
            <p className="text-stone-600 text-lg">
              Visitez notre showroom pour découvrir nos créations artisanales
            </p>
          </div>
          
          <Card className="max-w-4xl mx-auto shadow-xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-olive-100 to-stone-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-olive-600 mx-auto mb-4" />
                <h3 className="font-serif text-2xl text-stone-800 mb-2">Plan Interactif</h3>
                <p className="text-stone-600">123 Rue de l'Artisan, 75001 Paris</p>
                <Button 
                  className="mt-4 bg-olive-600 hover:bg-olive-700"
                  id="contact-map-directions"
                  name="get-directions-button"
                >
                  Obtenir l'Itinéraire
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default Contact;