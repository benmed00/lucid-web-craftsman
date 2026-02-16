import { Facebook, Instagram, Twitter } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const PageFooter = () => {
  const { t } = useTranslation(['common', 'pages']);
  
  return (
    <footer className="bg-secondary py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* About Section */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">{t('common:footer.about')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('common:footer.aboutText')}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">{t('common:footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/products"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common:nav.shop')}
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common:nav.blog')}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common:nav.contact')}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common:footer.story')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          {/* Information */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">{t('common:footer.information')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shipping"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.shippingAria')}
                >
                  {t('common:footer.shipping')}
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.returnsAria')}
                >
                  {t('common:footer.returns')}
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.faqAria')}
                >
                  {t('common:footer.faq')}
                </Link>
              </li>
              <li>
                <Link
                  to="/cgv"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.cgvAria')}
                >
                  {t('common:footer.cgv')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.terms')}
                >
                  {t('common:footer.terms')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:footer.termsOfServiceAria')}
                >
                  {t('common:footer.termsOfService')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-serif text-xl mb-4 text-foreground">{t('common:footer.newsletter')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('common:footer.newsletterText')}
            </p>
            <form className="space-y-2">
              <label htmlFor="newsletter-email-footer" className="sr-only">{t('common:footer.emailPlaceholder')}</label>
              <Input
                type="email"
                id="newsletter-email-footer"
                placeholder={t('common:footer.emailPlaceholder')}
                className="bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                aria-label={t('common:footer.emailPlaceholder')}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {t('common:footer.subscribe')}
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 text-center text-muted-foreground text-sm">
          <p>
            {t('common:footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
