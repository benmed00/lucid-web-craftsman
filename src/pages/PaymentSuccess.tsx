import { CheckCircle, ShoppingBag, Home, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import PageFooter from "@/components/PageFooter";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
  } | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerificationResult({
          success: false,
          message: "ID de session manquant"
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Verifying payment for session:", sessionId);
        
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId }
        });

        if (error) {
          console.error("Verification error:", error);
          setVerificationResult({
            success: false,
            message: "Erreur lors de la vérification du paiement"
          });
          toast.error("Erreur lors de la vérification du paiement");
        } else if (data?.success) {
          console.log("Payment verified successfully:", data);
          setVerificationResult({
            success: true,
            message: data.message || "Paiement vérifié avec succès",
            orderId: data.orderId
          });
          
          // Clear cart after successful verification
          clearCart();
          localStorage.removeItem('cart');
          
          toast.success("Paiement confirmé et stock mis à jour !");
        } else {
          console.log("Payment verification failed:", data);
          setVerificationResult({
            success: false,
            message: data?.message || "Échec de la vérification du paiement"
          });
          toast.error(data?.message || "Problème avec la vérification du paiement");
        }
      } catch (error) {
        console.error("Unexpected error during verification:", error);
        setVerificationResult({
          success: false,
          message: "Erreur inattendue"
        });
        toast.error("Erreur inattendue lors de la vérification");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, clearCart]);

  return (
    <div className="min-h-screen bg-background">
      
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            {isVerifying ? (
              <>
                <Loader2 className="w-20 h-20 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Vérification du Paiement
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  Nous vérifions votre paiement et mettons à jour votre commande...
                </p>
              </>
            ) : verificationResult?.success ? (
              <>
                <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Paiement Confirmé
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  Merci pour votre commande ! {verificationResult.message}
                </p>
                {sessionId && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Numéro de transaction : {sessionId.slice(-8).toUpperCase()}
                  </p>
                )}
                {verificationResult.orderId && (
                  <p className="text-sm text-muted-foreground mb-6">
                    Numéro de commande : {verificationResult.orderId.slice(-8).toUpperCase()}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Problème de Vérification
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {verificationResult?.message || "Une erreur s'est produite lors de la vérification de votre paiement."}
                </p>
              </>
            )}
          </div>

          <div className="bg-muted rounded-lg p-8 mb-8">
            <h2 className="text-xl font-medium text-foreground mb-4">
              Que se passe-t-il maintenant ?
            </h2>
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  1
                </div>
                <div>
                  <p className="text-foreground font-medium">Confirmation par email</p>
                  <p className="text-sm text-muted-foreground">Vous allez recevoir un email de confirmation avec les détails de votre commande.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  2
                </div>
                <div>
                  <p className="text-foreground font-medium">Préparation</p>
                  <p className="text-sm text-muted-foreground">Nos artisans vont préparer votre commande avec le plus grand soin.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                  3
                </div>
                <div>
                  <p className="text-foreground font-medium">Expédition</p>
                  <p className="text-sm text-muted-foreground">Votre commande sera expédiée sous 2-3 jours ouvrés.</p>
                </div>
              </div>
            </div>
          </div>

          {!isVerifying && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90">
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
          )}

          <div className="mt-12 p-6 bg-primary/10 rounded-lg">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Questions ou Problèmes ?
            </h3>
            <p className="text-muted-foreground mb-4">
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