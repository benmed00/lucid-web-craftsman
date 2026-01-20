import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEOHelmet from "@/components/seo/SEOHelmet";
import PageFooter from "@/components/PageFooter";

const Returns = () => {
  const { t } = useTranslation("pages");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title={t("pages:returns.seo.title")}
        description={t("pages:returns.seo.description")}
        keywords={["retours", "remboursements", "politique", "garantie"]}
        url="/returns"
        type="website"
      />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-serif font-semibold text-primary mb-6">
          {t("pages:returns.heading")}
        </h1>
        <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t("pages:returns.policy.title")}
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground mb-6">
            <li>{t("pages:returns.policy.item1")}</li>
            <li>{t("pages:returns.policy.item2")}</li>
            <li>{t("pages:returns.policy.item3")}</li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("pages:returns.procedure.title")}
          </h2>
          <ol className="list-decimal pl-6 text-muted-foreground mb-4">
            <li>
              {t("pages:returns.procedure.step1")}{" "}
              <Link
                to="/contact"
                className="text-primary underline hover:text-primary/80"
              >
                {t("pages:returns.procedure.step1Link")}
              </Link>{" "}
              {t("pages:returns.procedure.step1Suffix")}
            </li>
            <li>{t("pages:returns.procedure.step2")}</li>
            <li>{t("pages:returns.procedure.step3")}</li>
          </ol>
          <p className="text-muted-foreground">
            {t("pages:returns.questions")}{" "}
            <Link
              to="/faq"
              className="text-primary underline hover:text-primary/80"
            >
              {t("pages:returns.faqLink")}
            </Link>{" "}
            {t("pages:returns.questionsSuffix")}
          </p>
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default Returns;
