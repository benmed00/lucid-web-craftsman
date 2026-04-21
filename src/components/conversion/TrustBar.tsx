import { Shield, Truck, RotateCcw, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Slim horizontal trust bar — goes above footer or below hero */
export const TrustBar = () => {
  const { t } = useTranslation('common');

  const items = [
    { icon: Truck, text: t('trust.freeShipping', 'Livraison offerte dès 50€') },
    { icon: RotateCcw, text: t('trust.returns', 'Retours gratuits 14j') },
    { icon: Shield, text: t('trust.securePayment', 'Paiement sécurisé') },
    { icon: Award, text: t('trust.handmade', '100% fait main') },
  ];

  return (
    <div className="bg-secondary border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center md:justify-between items-center gap-4 md:gap-6 py-3 md:py-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <item.icon className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="whitespace-nowrap">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
