import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

const Shipping = () => {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t('pages:shipping.seo.title')}
        description={t('pages:shipping.seo.description')}
        keywords={['livraison', 'expédition', 'transport', 'délais', 'frais']}
        url="/shipping"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-serif font-semibold text-primary mb-6">
          {t('pages:shipping.heading')}
        </h1>
        <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t('pages:shipping.delays.title')}
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground mb-6">
            <li>
              {t('pages:shipping.delays.standard')}{' '}
              <span className="font-medium text-primary">
                {t('pages:shipping.delays.standardPrice')}
              </span>
            </li>
            <li>
              {t('pages:shipping.delays.express')}{' '}
              <span className="font-medium text-primary">
                {t('pages:shipping.delays.expressPrice')}
              </span>
            </li>
            <li>
              {t('pages:shipping.delays.freeFrom')}{' '}
              <span className="font-medium text-primary">
                {t('pages:shipping.delays.freeThreshold')}
              </span>{' '}
              {t('pages:shipping.delays.freeLabel')}
            </li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('pages:shipping.zones.title')}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t('pages:shipping.zones.description')}
          </p>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('pages:shipping.tracking.title')}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t('pages:shipping.tracking.description')}{' '}
            <Link
              to="/contact"
              className="text-primary underline hover:text-primary/80"
            >
              {t('common:nav.contact')}
            </Link>
            .
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default Shipping;
