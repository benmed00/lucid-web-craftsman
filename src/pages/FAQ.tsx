import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";

const FAQ = () => (
  <div className="min-h-screen bg-white flex flex-col">
    <Navigation />
    <main className="flex-1 container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-semibold text-olive-700 mb-8">
        Foire Aux Questions (FAQ)
      </h1>
      <div className="bg-beige-100 rounded-lg shadow p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Quels sont les délais de livraison ?
          </h2>
          <p className="text-stone-700">
            Les commandes sont expédiées sous 24h à 48h. La livraison standard
            prend généralement 3 à 5 jours ouvrés.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Comment suivre ma commande ?
          </h2>
          <p className="text-stone-700">
            Un email de confirmation avec un numéro de suivi vous sera envoyé
            dès l’expédition de votre commande.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Quels moyens de paiement acceptez-vous ?
          </h2>
          <p className="text-stone-700">
            Nous acceptons les paiements par carte bancaire (Visa, Mastercard),
            PayPal et Apple Pay.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Puis-je modifier ou annuler ma commande ?
          </h2>
          <p className="text-stone-700">
            Si votre commande n’a pas encore été expédiée, contactez-nous
            rapidement via la page Contact pour toute modification ou
            annulation.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Comment effectuer un retour ?
          </h2>
          <p className="text-stone-700">
            Consultez notre page{" "}
            <a
              href="/lucid-web-craftsman/returns"
              className="text-olive-700 underline hover:text-olive-800"
            >
              Retours
            </a>{" "}
            pour connaître la procédure détaillée.
          </p>
        </div>
      </div>
    </main>
    <PageFooter />
  </div>
);

export default FAQ;
