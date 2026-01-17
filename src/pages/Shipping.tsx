import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const Shipping = () => {
  const { t } = useTranslation("pages");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t("shipping.seo.title")}
        description={t("shipping.seo.description")}
        keywords={["livraison", "expédition", "transport", "délais", "frais"]}
        url="/shipping"
        type="website"
      />

      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-serif font-semibold text-primary mb-6">
          {t("shipping.heading")}
        </h1>
        <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t("shipping.delays.title")}
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground mb-6">
            <li>
              {t("shipping.delays.standard")}{" "}
              <span className="font-medium text-primary">{t("shipping.delays.standardPrice")}</span>
            </li>
            <li>
              {t("shipping.delays.express")}{" "}
              <span className="font-medium text-primary">{t("shipping.delays.expressPrice")}</span>
            </li>
            <li>
              {t("shipping.delays.freeFrom")} <span className="font-medium text-primary">{t("shipping.delays.freeThreshold")}</span>{" "}
              {t("shipping.delays.freeLabel")}
            </li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("shipping.zones.title")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("shipping.zones.description")}
          </p>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("shipping.tracking.title")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("shipping.tracking.description")}{" "}
            <Link
              to="/contact"
              className="text-primary underline hover:text-primary/80"
            >
              Contact
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
