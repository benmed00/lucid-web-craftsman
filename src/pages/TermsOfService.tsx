import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import {
  Shield,
  FileText,
  Scale,
  AlertTriangle,
  Users,
  Lock,
  Globe,
  Mail,
} from 'lucide-react';

const TermsOfService = () => {
  const { t, ready } = useTranslation(['pages', 'common'], {
    bindI18n: 'languageChanged loaded',
  });

  if (!ready) return null;

  const sections = [
    {
      icon: FileText,
      title: t('pages:termsOfService.sections.acceptance.title'),
      content: t('pages:termsOfService.sections.acceptance.content'),
    },
    {
      icon: Users,
      title: t('pages:termsOfService.sections.eligibility.title'),
      content: t('pages:termsOfService.sections.eligibility.content'),
    },
    {
      icon: Shield,
      title: t('pages:termsOfService.sections.account.title'),
      content: t('pages:termsOfService.sections.account.content'),
    },
    {
      icon: Scale,
      title: t('pages:termsOfService.sections.intellectualProperty.title'),
      content: t('pages:termsOfService.sections.intellectualProperty.content'),
    },
    {
      icon: AlertTriangle,
      title: t('pages:termsOfService.sections.prohibitedUse.title'),
      content: t('pages:termsOfService.sections.prohibitedUse.content'),
    },
    {
      icon: Lock,
      title: t('pages:termsOfService.sections.privacy.title'),
      content: t('pages:termsOfService.sections.privacy.content'),
    },
    {
      icon: Globe,
      title: t('pages:termsOfService.sections.jurisdiction.title'),
      content: t('pages:termsOfService.sections.jurisdiction.content'),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t('pages:termsOfService.seo.title')}
        description={t('pages:termsOfService.seo.description')}
        keywords={[
          'terms of service',
          "conditions d'utilisation",
          'service',
          'règles',
          'légal',
        ]}
        url="/terms-of-service"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {t('pages:termsOfService.heading')}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('pages:termsOfService.intro')}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {t('pages:termsOfService.lastUpdated')}:{' '}
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={index}
                  className="bg-card rounded-lg shadow-sm border border-border p-6 md:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-serif font-semibold text-foreground mb-3">
                        {index + 1}. {section.title}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-primary/5 rounded-lg p-6 md:p-8 text-center">
            <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
              {t('pages:termsOfService.contact.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('pages:termsOfService.contact.description')}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium underline underline-offset-4"
            >
              {t('common:nav.contact')}
            </Link>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              to="/cgv"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('common:footer.cgv')}
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('common:footer.terms')}
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              to="/faq"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('common:footer.faq')}
            </Link>
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default TermsOfService;
