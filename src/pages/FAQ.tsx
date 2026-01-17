import { useTranslation } from 'react-i18next';
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const FAQ = () => {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t('pages:faq.seo.title')}
        description={t('pages:faq.seo.description')}
        keywords={["faq", "questions", "réponses", "aide", "support", "livraison"]}
        url="/faq"
        type="website"
      />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-serif font-semibold text-primary mb-8">
          {t('pages:faq.title')}
        </h1>
        <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto space-y-6 border border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('pages:faq.shipping.q')}
            </h2>
            <p className="text-muted-foreground">
              {t('pages:faq.shipping.a')}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('pages:faq.tracking.q')}
            </h2>
            <p className="text-muted-foreground">
              {t('pages:faq.tracking.a')}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('pages:faq.payment.q')}
            </h2>
            <p className="text-muted-foreground">
              {t('pages:faq.payment.a')}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('pages:faq.modification.q')}
            </h2>
            <p className="text-muted-foreground">
              {t('pages:faq.modification.a')}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('pages:faq.returns.q')}
            </h2>
            <p className="text-muted-foreground">
              {t('pages:faq.returns.a.prefix')}{" "}
              <a
                href="/returns"
                className="text-primary underline hover:text-primary/80"
              >
                {t('pages:faq.returns.a.linkText')}
              </a>{" "}
              {t('pages:faq.returns.a.suffix')}
            </p>
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default FAQ;