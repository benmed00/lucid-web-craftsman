
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const CGV = () => (
  <div className="min-h-screen bg-white flex flex-col">
    <SEOHelmet
      title="Conditions Générales de Vente - Rif Raw Straw"
      description="Consultez nos conditions générales de vente pour vos achats d'artisanat berbère. Garanties, modalités de paiement et de livraison."
      keywords={["cgv", "conditions générales", "vente", "garantie", "paiement"]}
      url="/cgv"
      type="website"
    />
    
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto bg-beige-100 rounded-lg shadow p-8">
        <h1 className="text-3xl font-serif font-bold text-olive-700 mb-6">
          Conditions Générales de Vente
        </h1>
        <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-6">
          <li>Les commandes sont payables comptant à la commande.</li>
          <li>
            Les produits restent la propriété du vendeur jusqu’au paiement
            complet.
          </li>
          <li>
            Le client dispose d’un délai de rétractation de 14 jours après
            réception.
          </li>
          <li>
            Les retours doivent être effectués dans l’emballage d’origine et en
            parfait état.
          </li>
          <li>
            En cas de litige, le tribunal compétent sera celui du siège social
            du vendeur.
          </li>
        </ul>
        <p className="text-stone-700">
          Pour plus de détails, contactez-nous via la page{" "}
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

export default CGV;
