import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const CGV = () => {
  // const { t } = useTranslation(['pages', 'common']);

  const { t, ready } = useTranslation("pages");
  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t("pages:cgv.seo.title")}
        description={t("pages:cgv.seo.description")}
        keywords={["cgv", "conditions générales", "vente", "garantie", "paiement"]}
        url="/cgv"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card rounded-lg shadow p-8 border border-border">
          <h1 className="text-3xl font-serif font-bold text-primary mb-6">{t("pages:cgv.heading")}</h1>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            <li>{t("pages:cgv.items.item1")}</li>
            <li>{t("pages:cgv.items.item2")}</li>
            <li>{t("pages:cgv.items.item3")}</li>
            <li>{t("pages:cgv.items.item4")}</li>
            <li>{t("pages:cgv.items.item5")}</li>
          </ul>
          <p className="text-muted-foreground">
            {t("pages:cgv.contact")}{" "}
            <Link to="/contact" className="text-primary underline hover:text-primary/80">
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

export default CGV;
