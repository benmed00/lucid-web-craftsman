import { Leaf } from "lucide-react";
import NewsletterSubscription from "./NewsletterSubscription";
import { ErrorReportButton } from "./ui/ErrorReportButton";

const Footer = () => {
  return (
    <footer className="bg-stone-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Leaf className="h-5 w-5 text-olive-400" />
              <span className="font-serif text-xl font-medium">
                Rif Raw Straw
              </span>
            </div>
            <p className="text-stone-300 mb-6">
              Sacs et chapeaux artisanaux confectionnés avec des matériaux durables et des techniques traditionnelles berbères.
            </p>
            
            {/* Newsletter Subscription */}
            <NewsletterSubscription variant="footer" />
          </div>
          
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">
              Boutique
            </h3>
            <ul className="space-y-2" role="list">
              <li>
                <a 
                  href="/products" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Tous les produits - Voir tous nos produits artisanaux"
                >
                  Tous les produits
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Sacs" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Découvrir notre collection de sacs"
                >
                  Sacs
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Chapeaux" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Découvrir notre collection de chapeaux"
                >
                  Chapeaux
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">
              À propos
            </h3>
            <ul className="space-y-2" role="list">
              <li>
                <a 
                  href="/about" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="En savoir plus sur notre histoire et nos valeurs"
                >
                  Notre histoire
                </a>
              </li>
              <li>
                <a 
                  href="/blog" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Lire nos articles de blog sur l'artisanat"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">
              Aide
            </h3>
            <ul className="space-y-2" role="list">
              <li>
                <a 
                  href="/contact" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Nous contacter pour toute question"
                >
                  Contact
                </a>
              </li>
              <li>
                <a 
                  href="/shipping" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="Informations sur la livraison"
                >
                  Livraison
                </a>
              </li>
              <li>
                <a 
                  href="/faq" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="FAQ - Questions fréquemment posées"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a 
                  href="/cgv" 
                  className="text-stone-300 hover:text-olive-400 transition-colors"
                  aria-label="CGV - Lire nos conditions générales de vente"
                >
                  CGV
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-stone-600 mt-12 pt-6 text-center sm:text-left sm:flex sm:justify-between sm:items-center">
          <p className="text-stone-300">© 2024 Rif Raw Straw. Tous droits réservés.</p>
          <div className="mt-4 sm:mt-0">
            <ErrorReportButton />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;