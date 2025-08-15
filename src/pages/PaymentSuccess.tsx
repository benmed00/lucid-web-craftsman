import { CheckCircle, ShoppingBag, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear cart from localStorage on successful payment
    localStorage.removeItem('cart');
    
    // Show success message
    toast.success("Paiement confirmé avec succès !");
    
    // Optional: Send confirmation email or update order status
    // This would typically be handled by Stripe webhooks in production
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
            <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-4">
              Paiement Confirmé
            </h1>
            <p className="text-lg text-stone-600 mb-2">
              Merci pour votre commande ! Votre paiement a été traité avec succès.
            </p>
            {sessionId && (
              <p className="text-sm text-stone-500 mb-6">
                Numéro de transaction : {sessionId.slice(-8).toUpperCase()}
              </p>
            )}
          </div>

          <div className="bg-stone-50 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-medium text-stone-800 mb-4">
              Que se passe-t-il maintenant ?
            </h2>
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-olive-100 text-olive-700 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  1
                </div>
                <div>
                  <p className="text-stone-800 font-medium">Confirmation par email</p>
                  <p className="text-sm text-stone-600">Vous allez recevoir un email de confirmation avec les détails de votre commande.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-olive-100 text-olive-700 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  2
                </div>
                <div>
                  <p className="text-stone-800 font-medium">Préparation</p>
                  <p className="text-sm text-stone-600">Nos artisans vont préparer votre commande avec le plus grand soin.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-olive-100 text-olive-700 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  3
                </div>
                <div>
                  <p className="text-stone-800 font-medium">Expédition</p>
                  <p className="text-sm text-stone-600">Votre commande sera expédiée sous 2-3 jours ouvrés.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-olive-700 hover:bg-olive-800">
              <Link to="/products" className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Continuer mes achats
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center">
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>

          <div className="mt-12 p-6 bg-olive-50 rounded-lg">
            <h3 className="text-lg font-medium text-stone-800 mb-2">
              Questions ou Problèmes ?
            </h3>
            <p className="text-stone-600 mb-4">
              Notre équipe est là pour vous aider. N'hésitez pas à nous contacter.
            </p>
            <Button variant="outline" asChild>
              <Link to="/contact">
                Nous contacter
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default PaymentSuccess;