import { Leaf } from "lucide-react";
import { ErrorReportButton } from "./ui/ErrorReportButton";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation('common');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card text-card-foreground border-t border-border py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="font-serif text-lg sm:text-xl font-medium">
                {t('brand.name')}
              </span>
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
              {t('footer.aboutText')}
            </p>
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              {t('nav.shop')}
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/products" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.allProductsAria')}
                >
                  {t('footer.allProducts')}
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Sacs" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                >
                  {t('footer.bags')}
                </a>
              </li>
              <li>
                <a 
                  href="/products?category=Chapeaux" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                >
                  {t('footer.hats')}
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              {t('footer.about')}
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/about" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.storyAria')}
                >
                  {t('footer.story')}
                </a>
              </li>
              <li>
                <a 
                  href="/blog" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.blogAria')}
                >
                  {t('nav.blog')}
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium mb-3 sm:mb-4">
              {t('footer.help')}
            </h3>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              <li>
                <a 
                  href="/contact" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.contactAria')}
                >
                  {t('nav.contact')}
                </a>
              </li>
              <li>
                <a 
                  href="/shipping" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.shippingAria')}
                >
                  {t('footer.shipping')}
                </a>
              </li>
              <li>
                <a 
                  href="/returns" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.returnsAria')}
                >
                  {t('footer.returns')}
                </a>
              </li>
              <li>
                <a 
                  href="/faq" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.faqAria')}
                >
                  {t('footer.faq')}
                </a>
              </li>
              <li>
                <a 
                  href="/cgv" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.cgvAria')}
                >
                  {t('footer.cgv')}
                </a>
              </li>
              <li>
                <a 
                  href="/terms-of-service" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm sm:text-base block py-1 touch-manipulation"
                  aria-label={t('footer.termsOfServiceAria')}
                >
                  {t('footer.termsOfService')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 sm:mt-12 pt-4 sm:pt-6 text-center sm:text-left sm:flex sm:justify-between sm:items-center">
          <p className="text-muted-foreground text-sm sm:text-base">{t('footer.copyright', { year: currentYear })}</p>
          <div className="mt-3 sm:mt-0">
            <ErrorReportButton />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;