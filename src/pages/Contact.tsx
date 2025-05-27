import { Card, CardContent } from "@/components/ui/card";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { useEffect } from "react";

const Contact = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [window]);

  return (
    <div
      className="min-h-screen bg-white bg-cover bg-center relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80')",
      }}
    >
      {/* Overlay pour l'effet foncé */}
      <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none z-0" />
      <div className="relative z-10">
        <Navigation />

        {/* Hero Section */}
        <div className="relative bg-beige-100 py-24">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <svg
              className="absolute text-olive-200 opacity-20 top-0 left-0"
              width="400"
              height="400"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 0H200V200H0V0ZM76.5 154C118.75 154 153 119.75 153 77.5C153 35.25 118.75 1 76.5 1C34.25 1 0 35.25 0 77.5C0 119.75 34.25 154 76.5 154Z"
                fill="currentColor"
              />
            </svg>
            <svg
              className="absolute text-olive-200 opacity-20 bottom-0 right-0"
              width="300"
              height="300"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M197.998 45.615C195.558 38.0624 190.73 31.4392 184.24 26.6216C177.75 21.804 169.891 19.0331 161.775 18.6493C153.659 18.2655 145.573 20.2858 138.61 24.4152C131.648 28.5447 126.138 34.6088 122.879 41.8713C118.102 52.3348 103.595 95.0983 101.378 102.215C99.8534 106.991 96.0775 120.073 87.0991 147.051C86.3421 149.755 86.2106 152.625 86.7148 155.396C87.219 158.167 88.3449 160.764 90.0009 162.969C91.6568 165.173 93.7937 166.924 96.22 168.088C98.6464 169.251 101.294 169.797 103.972 169.678C123.675 168.806 145.266 163.737 164.876 154.816C180.9 147.574 190.082 135.785 195.5 121.417C200.917 107.049 202.087 93.4322 201.522 79.5992C200.958 65.7663 199.993 54.3002 197.998 45.615Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">
                Contactez-Nous
              </h1>
              <p className="text-stone-600 md:text-lg mb-8">
                Une question, une demande spéciale ou simplement envie de nous
                dire bonjour ? Nous serions ravis d'avoir de vos nouvelles.
              </p>
            </div>
          </div>
        </div>

        {/* Main Contact Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Contact Form */}
                <div className="lg:col-span-3">
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-8">
                      <Tabs defaultValue="message" className="mb-8">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="message">Message</TabsTrigger>
                          <TabsTrigger value="commande">Commande</TabsTrigger>
                        </TabsList>

                        <TabsContent value="message" className="mt-6">
                          <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="firstName">Prénom</Label>
                                <Input
                                  id="firstName"
                                  placeholder="Votre prénom"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="lastName">Nom</Label>
                                <Input id="lastName" placeholder="Votre nom" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="votre.email@exemple.com"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="phone">
                                  Téléphone (optionnel)
                                </Label>
                                <Input
                                  id="phone"
                                  placeholder="Votre numéro de téléphone"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="subject">Sujet</Label>
                              <Input
                                id="subject"
                                placeholder="Objet de votre message"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="message">Message</Label>
                              <textarea
                                id="message"
                                rows={5}
                                placeholder="Votre message..."
                                className="w-full px-3 py-2 text-base border border-stone-300 rounded-md focus:outline-none focus:border-olive-400"
                              ></textarea>
                            </div>

                            <Button className="w-full md:w-auto bg-olive-700 hover:bg-olive-800">
                              Envoyer le message
                            </Button>
                          </form>
                        </TabsContent>

                        <TabsContent value="commande" className="mt-6">
                          <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="orderName">Nom complet</Label>
                                <Input
                                  id="orderName"
                                  placeholder="Votre nom complet"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="orderNumber">
                                  Numéro de commande (si disponible)
                                </Label>
                                <Input
                                  id="orderNumber"
                                  placeholder="Ex: ORD-12345"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="orderEmail">Email</Label>
                              <Input
                                id="orderEmail"
                                type="email"
                                placeholder="Email utilisé pour la commande"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="orderSubject">Sujet</Label>
                              <select
                                id="orderSubject"
                                className="w-full h-10 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-olive-400"
                              >
                                <option value="">Sélectionnez un sujet</option>
                                <option value="status">
                                  Statut de ma commande
                                </option>
                                <option value="delay">
                                  Retard de livraison
                                </option>
                                <option value="return">
                                  Demande de retour
                                </option>
                                <option value="damaged">
                                  Produit endommagé
                                </option>
                                <option value="other">Autre question</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="orderMessage">Message</Label>
                              <textarea
                                id="orderMessage"
                                rows={5}
                                placeholder="Détails de votre question concernant la commande..."
                                className="w-full px-3 py-2 text-base border border-stone-300 rounded-md focus:outline-none focus:border-olive-400"
                              ></textarea>
                            </div>

                            <Button className="w-full md:w-auto bg-olive-700 hover:bg-olive-800">
                              Envoyer la demande
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Info */}
                <div className="lg:col-span-2 space-y-10">
                  <div>
                    <h2 className="font-serif text-2xl text-stone-800 mb-6">
                      Informations de Contact
                    </h2>

                    <div className="space-y-6">
                      <div className="flex">
                        <div className="mr-4 bg-olive-100 rounded-full p-3 text-olive-700">
                          <Mail className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-800 mb-1">
                            Email
                          </h3>
                          <p className="text-stone-600">
                            benyakoub.fr@google.com
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="mr-4 bg-olive-100 rounded-full p-3 text-olive-700">
                          <Phone className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-800 mb-1">
                            Téléphone
                          </h3>
                          <p className="text-stone-600">+33 (0)7 52 26 71 00</p>
                          <p className="text-sm text-stone-500 mt-1">
                            Mar-Sam, 10h-19h (CET)
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="mr-4 bg-olive-100 rounded-full p-3 text-olive-700">
                          <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-800 mb-1">
                            Adresse
                          </h3>
                          ;;[]
                          <p className="text-stone-600">
                            Av. de la Liberation
                            <br />
                            44400 Reze, France
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div>
                    <h2 className="font-serif text-2xl text-stone-800 mb-6">
                      Suivez-Nous
                    </h2>

                    <div className="flex space-x-4">
                      <a
                        href="https://instagram.com"
                        className="bg-olive-100 hover:bg-olive-200 transition-colors p-3 rounded-full text-olive-700"
                      >
                        <Instagram className="h-6 w-6" />
                      </a>
                      <a
                        href="https://facebook.com"
                        className="bg-olive-100 hover:bg-olive-200 transition-colors p-3 rounded-full text-olive-700"
                      >
                        <Facebook className="h-6 w-6" />
                      </a>
                      <a
                        href="https://twitter.com"
                        className="bg-olive-100 hover:bg-olive-200 transition-colors p-3 rounded-full text-olive-700"
                      >
                        <Twitter className="h-6 w-6" />
                      </a>
                    </div>
                  </div>

                  {/* FAQ */}
                  <div>
                    <h2 className="font-serif text-2xl text-stone-800 mb-4">
                      Questions Fréquentes
                    </h2>
                    <p className="text-stone-600 mb-4">
                      Consultez notre section FAQ pour des réponses rapides à
                      vos questions les plus courantes.
                    </p>
                    <Button
                      variant="outline"
                      className="border-olive-300 hover:bg-olive-50 hover:text-olive-800"
                    >
                      Voir la FAQ
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-16 bg-stone-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-serif text-3xl text-stone-800 mb-8 text-center">
                Notre Boutique
              </h2>

              <div className="rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3834.197662849835!2d-1.5499854565945288!3d47.1933490183861!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sfr!2sfr!4v1747692909066!5m2!1sfr!2sfr"
                  width="100%"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Map"
                ></iframe>
              </div>

              <div className="mt-8 text-center">
                <h3 className="font-medium text-stone-800 mb-2">
                  Horaires d'ouverture
                </h3>
                <p className="text-stone-600">
                  Lundi - Vendredi: 10h - 19h
                  <br />
                  Samedi: 10h - 18h
                  <br />
                  Dimanche: Fermé
                </p>
              </div>
            </div>
          </div>
        </section>

        <PageFooter />
      </div>
    </div>
  );
};

export default Contact;
