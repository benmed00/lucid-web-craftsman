import { useTranslation } from 'react-i18next';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

const Story = () => {
  const { t } = useTranslation('pages');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t('story.seo.title')}
        description={t('story.seo.description')}
        keywords={[
          'histoire',
          'artisanat berbère',
          'fait-main',
          'authenticité',
          'tradition',
        ]}
        url="/story"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card rounded-lg shadow p-8 border border-border">
          <h1 className="text-3xl font-serif font-bold text-primary mb-6">
            {t('story.heading')}
          </h1>
          <p className="text-lg text-foreground mb-6">
            {t('story.intro').split('<brand>')[0]}
            <span className="font-semibold text-primary">Rif Raw Straw</span>
            {t('story.intro').split('</brand>')[1]}
          </p>
          <p className="text-muted-foreground mb-4">{t('story.paragraph1')}</p>
          <p className="text-muted-foreground mb-4">{t('story.paragraph2')}</p>
          <p className="text-muted-foreground">{t('story.paragraph3')}</p>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default Story;
