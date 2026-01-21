import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const Terms = () => {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t("pages:terms.seo.title")}
        description={t("pages:terms.seo.description")}
        keywords={["conditions", "utilisation", "termes", "règles", "légal"]}
        url="/terms"
        type="website"
      />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card rounded-lg shadow p-8 border border-border">
          <h1 className="text-3xl font-serif font-bold text-primary mb-6">
            {t("pages:terms.heading")}
          </h1>
          <p className="text-foreground mb-4">
            {t("pages:terms.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>{t("pages:terms.items.item1")}</li>
            <li>{t("pages:terms.items.item2")}</li>
            <li>{t("pages:terms.items.item3")}</li>
            <li>{t("pages:terms.items.item4")}</li>
          </ul>
          <p className="text-muted-foreground">
            {t("pages:terms.contact")}{" "}
            <Link
              to="/contact"
              className="text-primary underline hover:text-primary/80"
            >
              {t("common:nav.contact")}
            </Link>
            .
          </p>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default Terms;
