import { useTranslation } from 'react-i18next';
import SEOHelmet from '@/components/seo/SEOHelmet';
import PageFooter from '@/components/PageFooter';

const About = () => {
  const { t } = useTranslation('pages');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t('about.seo.title')}
        description={t('about.seo.description')}
        keywords={[
          'à propos',
          'histoire',
          'artisanat berbère',
          'rif',
          'artisans',
          'mission',
        ]}
        url="/about"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card rounded-lg shadow p-8 border border-border">
          <h1 className="text-3xl font-serif font-bold text-primary mb-6">
            {t('about.heading')}
          </h1>
          <p className="text-lg text-foreground mb-6">
            {t('about.intro').split('<brand>')[0]}
            <span className="font-semibold text-primary">Rif Raw Straw</span>
            {t('about.intro').split('</brand>')[1]}
          </p>
          <p className="text-muted-foreground mb-4">{t('about.paragraph1')}</p>
          <p className="text-muted-foreground mb-4">{t('about.paragraph2')}</p>
          <p className="text-muted-foreground">{t('about.paragraph3')}</p>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default About;
