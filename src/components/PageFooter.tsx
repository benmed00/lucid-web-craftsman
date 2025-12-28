import { Facebook, Instagram, Twitter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const PageFooter = () => {
  return (
    <footer className="bg-secondary py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* About Section */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">Artisan</h3>
            <p className="text-muted-foreground mb-4">
              Sacs et accessoires artisanaux fabriqués à la main dans les
              montagnes du Rif au Maroc, perpétuant des traditions ancestrales
              avec des matériaux durables.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">Liens Rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/products"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Boutique
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Notre Histoire
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">Information</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shipping"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Livraison
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Retours
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/cgv"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Conditions Générales
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">Newsletter</h3>
            <p className="text-muted-foreground mb-4">
              Inscrivez-vous pour recevoir nos actualités et offres spéciales.
            </p>
            <form className="space-y-2">
              <label htmlFor="newsletter-email-footer" className="sr-only">Votre email</label>
              <Input
                type="email"
                id="newsletter-email-footer"
                placeholder="Votre email"
                className="bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                aria-label="Adresse email pour la newsletter"
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                S'abonner
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 text-center text-muted-foreground text-sm">
          <p>
            &copy; {new Date().getFullYear()} Artisan. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
