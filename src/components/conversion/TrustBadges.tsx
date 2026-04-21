import { Shield, Truck, RotateCcw, Lock, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrustBadgesProps {
  variant?: 'horizontal' | 'vertical' | 'compact';
  showPaymentIcons?: boolean;
}

export const TrustBadges = ({
  variant = 'horizontal',
  showPaymentIcons = false,
}: TrustBadgesProps) => {
  const { t } = useTranslation('common');

  const badges = [
    {
      icon: Lock,
      label: t('trust.securePayment', 'Paiement sécurisé'),
      sublabel: t('trust.ssl', 'SSL 256-bit'),
    },
    {
      icon: Truck,
      label: t('trust.freeShipping', 'Livraison offerte'),
      sublabel: t('trust.freeFrom', "Dès 50€ d'achat"),
    },
    {
      icon: RotateCcw,
      label: t('trust.returns', 'Retours gratuits'),
      sublabel: t('trust.returnDays', "14 jours pour changer d'avis"),
    },
    {
      icon: Shield,
      label: t('trust.guarantee', 'Qualité garantie'),
      sublabel: t('trust.handmade', '100% fait main'),
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <badge.icon className="h-3.5 w-3.5 text-primary" />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className="space-y-3">
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <badge.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{badge.label}</p>
              <p className="text-xs text-muted-foreground">{badge.sublabel}</p>
            </div>
          </div>
        ))}
        {showPaymentIcons && <PaymentIcons />}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map((badge, i) => (
        <div
          key={i}
          className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-secondary/50"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <badge.icon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">{badge.label}</p>
          <p className="text-xs text-muted-foreground">{badge.sublabel}</p>
        </div>
      ))}
    </div>
  );
};

export const PaymentIcons = () => (
  <div className="flex items-center gap-3 mt-2">
    <span className="text-xs text-muted-foreground">Paiement :</span>
    <div className="flex items-center gap-2">
      {/* Visa */}
      <div className="h-6 w-10 bg-muted rounded flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">VISA</span>
      </div>
      {/* Mastercard */}
      <div className="h-6 w-10 bg-muted rounded flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">MC</span>
      </div>
      {/* Stripe */}
      <div className="h-6 w-10 bg-muted rounded flex items-center justify-center">
        <CreditCard className="h-3.5 w-3.5 text-primary" />
      </div>
    </div>
  </div>
);
