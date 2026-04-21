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

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-center mb-12">{t('story.heading')}</h1>

          {/* Hero intro */}
          <div className="bg-card rounded-lg shadow-elegant p-8 md:p-12 border border-border mb-10">
            <p className="text-body-lg text-foreground leading-relaxed mb-6">
              {t('story.content')}
            </p>
            <p className="text-body-lg text-foreground leading-relaxed mb-6">
              {t('story.origins')}
            </p>
            <p className="text-body-lg text-foreground leading-relaxed mb-6">
              {t('story.craft')}
            </p>
            <p className="text-body-lg text-foreground leading-relaxed">
              {t('story.mission')}
            </p>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-6">
            {(['authenticity', 'sustainability', 'community'] as const).map(
              (value) => (
                <div
                  key={value}
                  className="bg-card rounded-lg border border-border p-6 text-center shadow-elegant"
                >
                  <h3 className="text-lg mb-2 text-primary">
                    {t(`story.values.${value}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`story.values.${value}.description`)}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default Story;
