import { useState, useEffect } from 'react';
import { Percent, Clock, Gift, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobilePromotionsProps {
  cartTotal?: number;
  onPromotionApply?: (promotionCode: string) => void;
}

interface Promotion {
  id: string;
  type: 'discount' | 'free_shipping' | 'gift' | 'flash_sale';
  title: string;
  description: string;
  code?: string;
  discount?: number;
  minAmount?: number;
  expiresAt?: string;
  isActive: boolean;
  isLimited?: boolean;
  remainingUses?: number;
  totalUses?: number;
}

export const MobilePromotions = ({ cartTotal = 0, onPromotionApply }: MobilePromotionsProps) => {
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});
  const isMobile = useIsMobile();

  const mockPromotions: Promotion[] = [
    {
      id: '1',
      type: 'flash_sale',
      title: 'Vente Flash Mobile',
      description: '20% de réduction pour les commandes mobiles',
      code: 'MOBILE20',
      discount: 20,
      minAmount: 50,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      isActive: true,
      isLimited: true,
      remainingUses: 15,
      totalUses: 50
    },
    {
      id: '2',
      type: 'free_shipping',
      title: 'Livraison Gratuite',
      description: 'Plus que 15€ pour la livraison gratuite',
      minAmount: 75,
      isActive: cartTotal < 75,
    },
    {
      id: '3',
      type: 'gift',
      title: 'Cadeau Offert',
      description: 'Un marque-page artisanal offert dès 100€',
      minAmount: 100,
      isActive: true,
    },
    {
      id: '4',
      type: 'discount',
      title: 'Première Commande',
      description: '15% de réduction sur votre première commande',
      code: 'BIENVENUE15',
      discount: 15,
      isActive: true,
    }
  ];

  useEffect(() => {
    // Filter promotions based on conditions
    const filtered = mockPromotions.filter(promo => {
      if (!promo.isActive) return false;
      if (promo.minAmount && cartTotal < promo.minAmount) {
        // Show promotions that are close to being unlocked
        return promo.minAmount - cartTotal <= 30;
      }
      return true;
    });

    setActivePromotions(filtered);
  }, [cartTotal]);

  useEffect(() => {
    // Update countdown timers
    const updateTimers = () => {
      const newTimeLeft: { [key: string]: string } = {};
      
      activePromotions.forEach(promo => {
        if (promo.expiresAt) {
          const now = new Date().getTime();
          const expiry = new Date(promo.expiresAt).getTime();
          const difference = expiry - now;
          
          if (difference > 0) {
            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            newTimeLeft[promo.id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        }
      });
      
      setTimeLeft(newTimeLeft);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    
    return () => clearInterval(interval);
  }, [activePromotions]);

  const getPromotionIcon = (type: Promotion['type']) => {
    switch (type) {
      case 'flash_sale':
        return <Clock className="h-4 w-4" />;
      case 'discount':
        return <Percent className="h-4 w-4" />;
      case 'gift':
        return <Gift className="h-4 w-4" />;
      case 'free_shipping':
        return <Star className="h-4 w-4" />;
      default:
        return <Percent className="h-4 w-4" />;
    }
  };

  const getPromotionColor = (type: Promotion['type']) => {
    switch (type) {
      case 'flash_sale':
        return 'bg-status-error/10 text-status-error border-status-error/20';
      case 'discount':
        return 'bg-status-info/10 text-status-info border-status-info/20';
      case 'gift':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'free_shipping':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleApplyPromotion = (promotion: Promotion) => {
    if (promotion.code && onPromotionApply) {
      onPromotionApply(promotion.code);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (!isMobile || activePromotions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {activePromotions.map((promotion) => (
        <Card
          key={promotion.id}
          className={`${getPromotionColor(promotion.type)} border-l-4`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getPromotionIcon(promotion.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{promotion.title}</h4>
                  
                  {promotion.type === 'flash_sale' && timeLeft[promotion.id] && (
                    <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs">
                      {timeLeft[promotion.id]}
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs mb-3 leading-relaxed">
                  {promotion.description}
                </p>
                
                {/* Progress bar for free shipping */}
                {promotion.type === 'free_shipping' && promotion.minAmount && cartTotal < promotion.minAmount && (
                  <div className="mb-3">
                    <Progress
                      value={calculateProgress(cartTotal, promotion.minAmount)}
                      className="h-2 mb-2"
                    />
                    <p className="text-xs font-medium">
                      Plus que {(promotion.minAmount - cartTotal).toFixed(2)}€ pour débloquer
                    </p>
                  </div>
                )}
                
                {/* Gift progress */}
                {promotion.type === 'gift' && promotion.minAmount && cartTotal < promotion.minAmount && (
                  <div className="mb-3">
                    <Progress
                      value={calculateProgress(cartTotal, promotion.minAmount)}
                      className="h-2 mb-2"
                    />
                    <p className="text-xs font-medium">
                      Plus que {(promotion.minAmount - cartTotal).toFixed(2)}€ pour le cadeau
                    </p>
                  </div>
                )}
                
                {/* Limited uses indicator */}
                {promotion.isLimited && promotion.remainingUses && promotion.totalUses && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Utilisations restantes</span>
                      <span>{promotion.remainingUses}/{promotion.totalUses}</span>
                    </div>
                    <Progress
                      value={(promotion.remainingUses / promotion.totalUses) * 100}
                      className="h-1"
                    />
                  </div>
                )}
                
                {/* Action button */}
                {promotion.code && (
                  <Button
                    size="sm"
                    onClick={() => handleApplyPromotion(promotion)}
                    disabled={promotion.minAmount ? cartTotal < promotion.minAmount : false}
                    className="bg-white/50 hover:bg-white/80 text-current border border-current/20 text-xs px-3 py-2 h-8"
                  >
                    {promotion.minAmount && cartTotal < promotion.minAmount
                      ? `Ajoutez ${(promotion.minAmount - cartTotal).toFixed(2)}€`
                      : `Appliquer ${promotion.code}`
                    }
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};