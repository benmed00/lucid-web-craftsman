import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  Gift, 
  Star, 
  Trophy, 
  Coins, 
  History, 
  ShoppingCart,
  Sparkles 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LoyaltyPoints {
  id: string;
  user_id: string;
  points_balance: number;
  total_points_earned: number;
  total_points_spent: number;
  tier: string;
  tier_progress: number;
  next_tier_threshold: number;
  created_at: string;
  updated_at: string;
}

interface LoyaltyTransaction {
  id: string;
  points_change: number;
  transaction_type: string;
  source_type: string;
  description: string;
  created_at: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  reward_value: any;
  min_tier: string;
  is_active: boolean;
  usage_count: number;
  usage_limit: number | null;
}

interface LoyaltyProgramProps {
  user: User;
}

export function LoyaltyProgram({ user }: LoyaltyProgramProps) {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  // Load data once on mount - use ref to prevent repeated calls
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadLoyaltyData();
  }, []); // Empty deps - only run once

  const loadLoyaltyData = async () => {
    try {
      // Load loyalty points
      const { data: pointsData, error: pointsError } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pointsError) {
        console.error('Error loading loyalty points:', pointsError);
      }

      if (!pointsData) {
        // Initialize loyalty account for existing user
        try {
          await supabase.rpc('init_loyalty_account', { p_user_id: user.id });
          const { data: newPointsData } = await supabase
            .from('loyalty_points')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          setLoyaltyData(newPointsData);
        } catch (initError) {
          console.error('Error initializing loyalty account:', initError);
          // Still continue - show empty state
        }
      } else {
        setLoyaltyData(pointsData);
      }

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions(transactionsData || []);

      // Load available rewards
      const { data: rewardsData } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      setRewards(rewardsData || []);

    } catch (error: any) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierInfo = (tier: string) => {
    const tiers = {
      bronze: { name: 'Bronze', color: 'bg-orange-500', icon: Coins, textColor: 'text-orange-600 dark:text-orange-400' },
      silver: { name: 'Argent', color: 'bg-gray-400', icon: Star, textColor: 'text-gray-600 dark:text-gray-400' },
      gold: { name: 'Or', color: 'bg-yellow-500', icon: Trophy, textColor: 'text-yellow-600 dark:text-yellow-400' },
      platinum: { name: 'Platine', color: 'bg-purple-500', icon: Crown, textColor: 'text-purple-600 dark:text-purple-400' }
    };
    return tiers[tier as keyof typeof tiers] || tiers.bronze;
  };

  const getRewardIcon = (rewardType: string) => {
    const icons = {
      discount: ShoppingCart,
      free_shipping: Gift,
      product: Sparkles
    };
    return icons[rewardType as keyof typeof icons] || Gift;
  };

  const canRedeemReward = (reward: LoyaltyReward) => {
    if (!loyaltyData) return false;
    
    // Check if user has enough points
    if (loyaltyData.points_balance < reward.points_cost) return false;
    
    // Check if user's tier is high enough
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const userTierIndex = tierOrder.indexOf(loyaltyData.tier);
    const rewardTierIndex = tierOrder.indexOf(reward.min_tier);
    
    if (userTierIndex < rewardTierIndex) return false;
    
    // Check usage limit
    if (reward.usage_limit && reward.usage_count >= reward.usage_limit) return false;
    
    return true;
  };

  const redeemReward = async (rewardId: string) => {
    if (!loyaltyData) return;
    
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    setIsRedeeming(rewardId);
    try {
      // Create redemption record
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const { error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .insert({
          user_id: user.id,
          reward_id: rewardId,
          points_spent: reward.points_cost,
          expires_at: expiryDate.toISOString()
        });

      if (redemptionError) throw redemptionError;

      // Deduct points
      await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id,
        p_points: -reward.points_cost,
        p_source_type: 'redemption',
        p_source_id: rewardId,
        p_description: `Échange: ${reward.name}`
      });

      toast.success(`${reward.name} échangée avec succès !`);
      loadLoyaltyData(); // Reload data
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      toast.error('Erreur lors de l\'échange de la récompense');
    } finally {
      setIsRedeeming(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!loyaltyData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Programme de fidélité</h3>
            <p className="text-muted-foreground">
              Votre compte fidélité sera activé lors de votre première commande.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = getTierInfo(loyaltyData.tier);
  const TierIcon = tierInfo.icon;
  const progressPercentage = loyaltyData.next_tier_threshold > 0 
    ? (loyaltyData.tier_progress / (loyaltyData.next_tier_threshold - (loyaltyData.total_points_earned - loyaltyData.tier_progress))) * 100 
    : 100;

  return (
    <div className="space-y-6">
      {/* Loyalty Overview Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Programme de Fidélité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Points Balance */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {loyaltyData.points_balance.toLocaleString()}
              </div>
              <p className="text-muted-foreground">Points disponibles</p>
            </div>

            {/* Current Tier */}
            <div className="flex items-center justify-center gap-3 p-4 bg-card/50 rounded-lg">
              <div className={`p-2 rounded-full ${tierInfo.color}`}>
                <TierIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Niveau {tierInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {loyaltyData.total_points_earned.toLocaleString()} points gagnés au total
                </div>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {loyaltyData.next_tier_threshold > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression vers le niveau suivant</span>
                  <span>{loyaltyData.tier_progress} / {loyaltyData.next_tier_threshold - (loyaltyData.total_points_earned - loyaltyData.tier_progress)}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Plus que {loyaltyData.next_tier_threshold - loyaltyData.total_points_earned} points pour le niveau suivant
                </p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{loyaltyData.total_points_earned.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Points gagnés</div>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  -{loyaltyData.total_points_spent.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Points dépensés</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards and History Tabs */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Récompenses
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Récompenses disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rewards.map((reward) => {
                  const RewardIcon = getRewardIcon(reward.reward_type);
                  const canRedeem = canRedeemReward(reward);
                  const tierInfo = getTierInfo(reward.min_tier);

                  return (
                    <div key={reward.id} className={`border rounded-lg p-4 ${canRedeem ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${canRedeem ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <RewardIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{reward.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {reward.description}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {reward.points_cost} points
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${tierInfo.textColor}`}>
                                Niveau {getTierInfo(reward.min_tier).name} requis
                              </Badge>
                            </div>
                            {reward.usage_limit && (
                              <p className="text-xs text-muted-foreground">
                                {reward.usage_count} / {reward.usage_limit} échangées
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canRedeem || isRedeeming === reward.id}
                          onClick={() => redeemReward(reward.id)}
                        >
                          {isRedeeming === reward.id ? 'Échange...' : 'Échanger'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des points ({transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune transaction</h3>
                  <p className="text-muted-foreground">
                    Vos transactions de points apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                            transaction.points_change > 0 
                              ? 'bg-status-success/10 text-status-success' 
                              : 'bg-status-error/10 text-status-error'
                          }`}>
                            {transaction.points_change > 0 ? (
                              <Sparkles className="h-4 w-4" />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transaction.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className={`text-lg font-semibold ${
                          transaction.points_change > 0 
                            ? 'text-status-success' 
                            : 'text-status-error'
                        }`}>
                          {transaction.points_change > 0 ? '+' : ''}{transaction.points_change}
                        </div>
                      </div>
                      {index < transactions.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}