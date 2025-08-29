import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const Terms = () => (
  <div className="min-h-screen bg-white flex flex-col">
    <SEOHelmet
      title="Conditions d'utilisation - Rif Raw Straw"
      description="Consultez nos conditions d'utilisation pour comprendre les règles et modalités d'usage de notre boutique d'artisanat marocain."
      keywords={["conditions", "utilisation", "termes", "règles", "légal"]}
      url="/terms"
      type="website"
    />
    <Navigation />
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto bg-beige-100 rounded-lg shadow p-8">
        <h1 className="text-3xl font-serif font-bold text-olive-700 mb-6">
          Conditions d’utilisation
        </h1>
        <p className="text-stone-700 mb-4">
          En accédant à ce site, vous acceptez nos conditions d’utilisation.
          Veuillez lire attentivement les informations ci-dessous.
        </p>
        <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-6">
          <li>Le contenu du site est protégé par le droit d’auteur.</li>
          <li>
            Vous ne pouvez pas reproduire, distribuer ou exploiter le contenu
            sans autorisation écrite.
          </li>
          <li>
            Les prix et informations produits sont susceptibles d’être modifiés
            à tout moment.
          </li>
          <li>
            Nous nous réservons le droit de refuser une commande en cas de
            litige antérieur.
          </li>
        </ul>
        <p className="text-stone-700">
          Pour toute question, contactez-nous via la page{" "}
          <a
            href="/contact"
            className="text-olive-700 underline hover:text-olive-800"
          >
            Contact
          </a>
          .
        </p>
      </div>
    </main>
    <PageFooter />
  </div>
);

export default Terms;
