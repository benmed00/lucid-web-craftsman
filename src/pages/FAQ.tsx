import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";

const FAQ = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHelmet
      title="FAQ - Questions Fréquentes | Rif Raw Straw"
      description="Trouvez les réponses à vos questions sur nos produits artisanaux, livraison, retours et notre artisanat berbère."
      keywords={["faq", "questions", "réponses", "aide", "support", "livraison"]}
      url="/faq"
      type="website"
    />
    
    <main className="flex-1 container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-semibold text-primary mb-8">
        Foire Aux Questions (FAQ)
      </h1>
      <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto space-y-6 border border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Quels sont les délais de livraison ?
          </h2>
          <p className="text-muted-foreground">
            Les commandes sont expédiées sous 24h à 48h. La livraison standard
            prend généralement 3 à 5 jours ouvrés.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Comment suivre ma commande ?
          </h2>
          <p className="text-muted-foreground">
            Un email de confirmation avec un numéro de suivi vous sera envoyé
            dès l'expédition de votre commande.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Quels moyens de paiement acceptez-vous ?
          </h2>
          <p className="text-muted-foreground">
            Nous acceptons les paiements par carte bancaire (Visa, Mastercard),
            PayPal et Apple Pay.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Puis-je modifier ou annuler ma commande ?
          </h2>
          <p className="text-muted-foreground">
            Si votre commande n'a pas encore été expédiée, contactez-nous
            rapidement via la page Contact pour toute modification ou
            annulation.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Comment effectuer un retour ?
          </h2>
          <p className="text-muted-foreground">
            Consultez notre page{" "}
            <a
              href="/returns"
              className="text-primary underline hover:text-primary/80"
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
