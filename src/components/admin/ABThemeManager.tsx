import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLatestAbThemeTest,
  updateAbThemeTestById,
  resetAbThemeTestCounters,
} from '@/services/adminAbThemeTestsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { FlaskConical, BarChart3, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ABTest {
  id: string;
  name: string;
  is_active: boolean;
  variant_a: string;
  variant_b: string;
  split_percentage: number;
  variant_a_views: number;
  variant_b_views: number;
  variant_a_add_to_cart: number;
  variant_b_add_to_cart: number;
  variant_a_checkout: number;
  variant_b_checkout: number;
  updated_at: string;
}

const pct = (n: number, total: number) =>
  total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`;

const ABThemeManager = () => {
  const qc = useQueryClient();
  const [split, setSplit] = useState(50);

  const { data: test, isLoading } = useQuery<ABTest | null>({
    queryKey: ['ab-theme-test-admin'],
    queryFn: async () => {
      const data = await fetchLatestAbThemeTest();
      if (data) setSplit((data as unknown as ABTest).split_percentage);
      return (data as unknown as ABTest) ?? null;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!test) return;
      await updateAbThemeTestById(test.id, {
        is_active: active,
        split_percentage: split,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ab-theme-test-admin'] });
      toast.success('Test A/B mis à jour');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!test) return;
      await resetAbThemeTestCounters(test.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ab-theme-test-admin'] });
      toast.success('Compteurs réinitialisés');
    },
  });

  if (isLoading)
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  if (!test) return null;

  const totalA = test.variant_a_views;
  const totalB = test.variant_b_views;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">A/B Test Thème UI</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={test.is_active ? 'default' : 'secondary'}>
            {test.is_active ? 'Actif' : 'Inactif'}
          </Badge>
          <Switch
            checked={test.is_active}
            onCheckedChange={(v) => toggleMutation.mutate(v)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Split control */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Répartition : {split}% Modern / {100 - split}% Legacy
          </p>
          <Slider
            value={[split]}
            onValueChange={([v]) => setSplit(v)}
            onValueCommit={() => {
              if (test.is_active) toggleMutation.mutate(true);
            }}
            min={10}
            max={90}
            step={5}
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              <span className="font-semibold text-sm">
                Variant A — {test.variant_a}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Vues : <strong>{totalA}</strong>
              </p>
              <p>
                Ajouts panier : <strong>{test.variant_a_add_to_cart}</strong> (
                {pct(test.variant_a_add_to_cart, totalA)})
              </p>
              <p>
                Checkouts : <strong>{test.variant_a_checkout}</strong> (
                {pct(test.variant_a_checkout, totalA)})
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              <span className="font-semibold text-sm">
                Variant B — {test.variant_b}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Vues : <strong>{totalB}</strong>
              </p>
              <p>
                Ajouts panier : <strong>{test.variant_b_add_to_cart}</strong> (
                {pct(test.variant_b_add_to_cart, totalB)})
              </p>
              <p>
                Checkouts : <strong>{test.variant_b_checkout}</strong> (
                {pct(test.variant_b_checkout, totalB)})
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMutation.mutate()}
          className="gap-2"
        >
          <RotateCcw className="h-3 w-3" />
          Réinitialiser compteurs
        </Button>
      </CardContent>
    </Card>
  );
};

export default ABThemeManager;
