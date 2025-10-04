import { Link } from "react-router-dom";
import SEOHelmet from "@/components/seo/SEOHelmet";

import PageFooter from "@/components/PageFooter";

const Returns = () => (
  <div className="min-h-screen bg-white flex flex-col">
    <SEOHelmet
      title="Retours & Remboursements - Rif Raw Straw"
      description="Politique de retour et remboursement pour vos achats d'artisanat marocain. 14 jours pour retourner vos articles."
      keywords={["retours", "remboursements", "politique", "garantie"]}
      url="/returns"
      type="website"
    />
    
    <main className="flex-1 container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-semibold text-olive-700 mb-6">
        Retours & Remboursements
      </h1>
      <div className="bg-beige-100 rounded-lg shadow p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-stone-800 mb-4">
          Politique de retour
        </h2>
        <ul className="list-disc pl-6 text-stone-700 mb-6">
          <li>
            Vous disposez de 14 jours après réception pour retourner un article.
          </li>
          <li>
            Les produits doivent être neufs, non utilisés et dans leur emballage
            d’origine.
          </li>
          <li>
            Les frais de retour sont à la charge du client sauf erreur de notre
            part.
          </li>
        </ul>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Procédure</h2>
        <ol className="list-decimal pl-6 text-stone-700 mb-4">
          <li>
            Contactez-nous via la page{" "}
            <Link
              to="/contact"
              className="text-olive-700 underline hover:text-olive-800"
            >
              Contact
            </Link>{" "}
            en précisant votre numéro de commande.
          </li>
          <li>
            Nous vous indiquerons l’adresse de retour et la marche à suivre.
          </li>
          <li>
            Après réception et vérification, le remboursement sera effectué sous
            7 jours ouvrés.
          </li>
        </ol>
        <p className="text-stone-700">
          Pour toute question, n’hésitez pas à consulter notre{" "}
          <Link
            to="/faq"
            className="text-olive-700 underline hover:text-olive-800"
          >
            FAQ
          </Link>{" "}
          ou à nous écrire.
        </p>
      </div>
    </main>
    <PageFooter />
  </div>
);

export default Returns;
