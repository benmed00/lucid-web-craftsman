import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface CartSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, shipping, total }) => {
  return (
    <div className="lg:col-span-1">
      <div className="border rounded-lg p-6 bg-stone-50">
        <h3 className="font-serif text-xl text-stone-800 mb-4">
          Récapitulatif
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-stone-600">Sous-total</span>
            <span className="font-medium">{subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Frais de livraison</span>
            <span className="font-medium">{shipping.toFixed(2)} €</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg">
            <span className="font-medium">Total</span>
            <span className="font-medium text-olive-700">
              {total.toFixed(2)} €
            </span>
          </div>
        </div>

        <Link to="/checkout">
          <Button className="w-full bg-olive-700 hover:bg-olive-800 text-white">
            Passer à la caisse
          </Button>
        </Link>

        <div className="mt-6 text-center text-sm text-stone-500">
          Moyens de paiement sécurisés : Carte Bancaire, PayPal
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
