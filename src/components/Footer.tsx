import { Leaf } from "lucide-react";
import NewsletterSubscription from "./NewsletterSubscription";
import { ErrorReportButton } from "./ui/ErrorReportButton";

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground border-t border-border py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="font-serif text-lg sm:text-xl font-medium">
                Rif Raw Straw
              </span>
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
              Sacs et chapeaux artisanaux confectionnés avec des matériaux durables et des techniques traditionnelles berbères.
            </p>
            
            {/* Newsletter Subscription */}
            <NewsletterSubscription variant="footer" />
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              Boutique
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/products" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Tous les produits - Voir tous nos produits artisanaux"
                >
                  Tous les produits
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Sacs" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Découvrir notre collection de sacs"
                >
                  Sacs
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Chapeaux" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Découvrir notre collection de chapeaux"
                >
                  Chapeaux
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              À propos
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/about" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="En savoir plus sur notre histoire et nos valeurs"
                >
                  Notre histoire
                </a>
              </li>
              <li>
                <a 
                  href="/blog" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Lire nos articles de blog sur l'artisanat"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              Aide
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/contact" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Nous contacter pour toute question"
                >
                  Contact
                </a>
              </li>
              <li>
                <a 
                  href="/shipping" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="Informations sur la livraison"
                >
                  Livraison
                </a>
              </li>
              <li>
                <a 
                  href="/faq" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="FAQ - Questions fréquemment posées"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a 
                  href="/cgv" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label="CGV - Lire nos conditions générales de vente"
                >
                  CGV
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 sm:mt-12 pt-4 sm:pt-6 text-center sm:text-left sm:flex sm:justify-between sm:items-center">
          <p className="text-muted-foreground text-sm sm:text-base">© 2024 Rif Raw Straw. Tous droits réservés.</p>
          <div className="mt-3 sm:mt-0">
            <ErrorReportButton />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;