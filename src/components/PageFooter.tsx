import { Facebook, Instagram, Twitter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const PageFooter = () => {
  return (
    <footer className="bg-olive-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* About Section */}
          <div>
            <h3 className="font-serif text-xl mb-4">Artisan</h3>
            <p className="text-olive-100 mb-4">
              Sacs et accessoires artisanaux fabriqués à la main dans les
              montagnes du Rif au Maroc, perpétuant des traditions ancestrales
              avec des matériaux durables.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com"
                className="text-olive-200 hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                className="text-olive-200 hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-olive-200 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-xl mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/products"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Boutique
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Notre Histoire
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-serif text-xl mb-4">Information</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shipping"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Livraison
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Retours
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/cgv"
                  className="text-olive-200 hover:text-white transition-colors"
                >
                  Conditions Générales
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-serif text-xl mb-4">Newsletter</h3>
            <p className="text-olive-200 mb-4">
              Inscrivez-vous pour recevoir nos actualités et offres spéciales.
            </p>
            <form className="space-y-2">
              <label htmlFor="newsletter-email-footer" className="sr-only">Votre email</label>
              <Input
                type="email"
                id="newsletter-email-footer"
                placeholder="Votre email"
                className="bg-olive-800 border-olive-700 focus:border-olive-500 text-white placeholder:text-olive-400"
                aria-label="Adresse email pour la newsletter"
              />
              <Button type="submit" className="w-full bg-beige-400 hover:bg-beige-500 text-olive-900">
                S'abonner
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-olive-800 mt-10 pt-6 text-center text-olive-300 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Artisan. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
