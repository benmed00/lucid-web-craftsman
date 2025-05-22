import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";

const Shipping = () => (
  <div className="min-h-screen bg-white flex flex-col">
    <Navigation />

    <main className="flex-1 container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-semibold text-olive-700 mb-6">
        Livraison & Expédition
      </h1>
      <div className="bg-beige-100 rounded-lg shadow p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-stone-800 mb-4">
          Délais & Tarifs
        </h2>
        <ul className="list-disc pl-6 text-stone-700 mb-6">
          <li>
            Livraison standard (3-5 jours ouvrés) :{" "}
            <span className="font-medium text-olive-700">4,90 €</span>
          </li>
          <li>
            Livraison express (24/48h) :{" "}
            <span className="font-medium text-olive-700">9,90 €</span>
          </li>
          <li>
            Offerte dès <span className="font-medium text-olive-700">80 €</span>{" "}
            d’achat
          </li>
        </ul>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">
          Zones desservies
        </h2>
        <p className="text-stone-700 mb-4">
          Nous livrons en France métropolitaine, Belgique, Luxembourg et Suisse.
        </p>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">
          Suivi & Service
        </h2>
        <p className="text-stone-700 mb-4">
          Un numéro de suivi vous sera envoyé dès l’expédition de votre
          commande. Pour toute question, contactez-nous via la page{" "}
          <Link
            to="/contact"
            className="text-olive-700 underline hover:text-olive-800"
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
