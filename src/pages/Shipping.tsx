import { Link } from "react-router-dom";

import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const Shipping = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHelmet
      title="Livraison et Expédition - Rif Raw Straw"
      description="Découvrez nos options de livraison pour vos achats d'artisanat marocain. Livraison rapide et sécurisée en France et à l'international."
      keywords={["livraison", "expédition", "transport", "délais", "frais"]}
      url="/shipping"
      type="website"
    />
    

    <main className="flex-1 container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-semibold text-primary mb-6">
        Livraison & Expédition
      </h1>
      <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Délais & Tarifs
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground mb-6">
          <li>
            Livraison standard (3-5 jours ouvrés) :{" "}
            <span className="font-medium text-primary">4,90 €</span>
          </li>
          <li>
            Livraison express (24/48h) :{" "}
            <span className="font-medium text-primary">9,90 €</span>
          </li>
          <li>
            Offerte dès <span className="font-medium text-primary">80 €</span>{" "}
            d'achat
          </li>
        </ul>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Zones desservies
        </h2>
        <p className="text-muted-foreground mb-4">
          Nous livrons en France métropolitaine, Belgique, Luxembourg et Suisse.
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Suivi & Service
        </h2>
        <p className="text-muted-foreground mb-4">
          Un numéro de suivi vous sera envoyé dès l'expédition de votre
          commande. Pour toute question, contactez-nous via la page{" "}
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

export default Shipping;
