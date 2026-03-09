import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Crown,
  Gift,
  Star,
  Trophy,
  Coins,
  History,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

async function fetchLoyaltyData(userId: string) {
  let pointsData: LoyaltyPoints | null = null;

  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) console.error('Error loading loyalty points:', error);

  if (!data) {
    // Try to initialize loyalty account
    try {
      await supabase.rpc('init_loyalty_account', { p_user_id: userId });
      const { data: newData } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      pointsData = newData;
    } catch (e) {
      console.error('Error initializing loyalty account:', e);
    }
  } else {
    pointsData = data;
  }

  const { data: transactionsData } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: rewardsData } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('is_active', true)
    .order('points_cost', { ascending: true });

  return {
    loyaltyData: pointsData,
    transactions: (transactionsData || []) as LoyaltyTransaction[],
    rewards: (rewardsData || []) as LoyaltyReward[],
  };
}

export function LoyaltyProgram({ user }: LoyaltyProgramProps) {
  const queryClient = useQueryClient();
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty', user.id],
    queryFn: () => fetchLoyaltyData(user.id),
    staleTime: 5 * 60 * 1000, // cache 5 min — no re-fetch on tab switch
    retry: 1,
  });

  const loyaltyData = data?.loyaltyData ?? null;
  const transactions = data?.transactions ?? [];
  const rewards = data?.rewards ?? [];

  const getTierInfo = (tier: string) => {
    const tiers = {
      bronze: {
        name: 'Bronze',
        color: 'bg-orange-500',
        icon: Coins,
        textColor: 'text-orange-600 dark:text-orange-400',
      },
      silver: {
        name: 'Argent',
        color: 'bg-gray-400',
        icon: Star,
        textColor: 'text-gray-600 dark:text-gray-400',
      },
      gold: {
        name: 'Or',
        color: 'bg-yellow-500',
        icon: Trophy,
        textColor: 'text-yellow-600 dark:text-yellow-400',
      },
      platinum: {
        name: 'Platine',
        color: 'bg-purple-500',
        icon: Crown,
        textColor: 'text-purple-600 dark:text-purple-400',
      },
    };
    return tiers[tier as keyof typeof tiers] || tiers.bronze;
  };

  const handleRedeemReward = async (reward: LoyaltyReward) => {
    if (!loyaltyData || loyaltyData.points_balance < reward.points_cost) {
      toast.error('Points insuffisants pour cette récompense');
      return;
    }

    setIsRedeeming(reward.id);
    try {
      const { error } = await supabase.from('loyalty_redemptions').insert({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.points_cost,
        status: 'pending',
      });

      if (error) throw error;

      await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id,
        p_points: -reward.points_cost,
        p_source_type: 'redemption',
        p_source_id: reward.id,
        p_description: `Échange: ${reward.name}`,
      });

      toast.success(`Récompense "${reward.name}" échangée avec succès!`);
      // Invalidate cache so data refreshes
      queryClient.invalidateQueries({ queryKey: ['loyalty', user.id] });
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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
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
              Votre compte de fidélité est en cours d'initialisation. Passez votre première commande pour commencer à gagner des points!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = getTierInfo(loyaltyData.tier);
  const TierIcon = tierInfo.icon;
  const progressPercentage = loyaltyData.next_tier_threshold > 0
    ? Math.min((loyaltyData.tier_progress / loyaltyData.next_tier_threshold) * 100, 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Loyalty Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Programme de Fidélité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${tierInfo.color} mb-3`}>
                <TierIcon className="h-8 w-8 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">Niveau actuel</p>
              <p className={`text-xl font-bold ${tierInfo.textColor}`}>{tierInfo.name}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Solde de points</p>
              <p className="text-xl font-bold text-foreground">{loyaltyData.points_balance.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Total gagné</p>
              <p className="text-xl font-bold text-foreground">{loyaltyData.total_points_earned.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress to next tier */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression vers le niveau suivant</span>
              <span className="font-medium">{loyaltyData.tier_progress.toLocaleString()} / {loyaltyData.next_tier_threshold.toLocaleString()} pts</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for rewards and history */}
      <Tabs defaultValue="rewards">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Récompenses disponibles
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-8">
                <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune récompense disponible pour le moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => {
                const canAfford = loyaltyData.points_balance >= reward.points_cost;
                return (
                  <Card key={reward.id} className={!canAfford ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{reward.name}</h4>
                          <p className="text-sm text-muted-foreground">{reward.description}</p>
                        </div>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {reward.points_cost.toLocaleString()} pts
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!canAfford || isRedeeming === reward.id}
                        onClick={() => handleRedeemReward(reward)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isRedeeming === reward.id ? 'Échange en cours...' : canAfford ? 'Échanger' : 'Points insuffisants'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune transaction pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <Badge variant={transaction.points_change >= 0 ? 'default' : 'destructive'}>
                          {transaction.points_change >= 0 ? '+' : ''}{transaction.points_change} pts
                        </Badge>
                      </div>
                      {index < transactions.length - 1 && <Separator className="mt-4" />}
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
