// src/components/admin/BusinessRulesConfig.tsx
// Admin panel for configuring business rules

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  Heart, 
  CreditCard, 
  Phone, 
  Save, 
  RefreshCw,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { DEFAULT_BUSINESS_RULES, type BusinessRules, clearBusinessRulesCache } from '@/hooks/useBusinessRules';

export const BusinessRulesConfig: React.FC = () => {
  const [rules, setRules] = useState<BusinessRules>(DEFAULT_BUSINESS_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'business_rules')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        const fetchedRules = data.setting_value as Partial<BusinessRules>;
        setRules({
          cart: { ...DEFAULT_BUSINESS_RULES.cart, ...fetchedRules.cart },
          wishlist: { ...DEFAULT_BUSINESS_RULES.wishlist, ...fetchedRules.wishlist },
          checkout: { ...DEFAULT_BUSINESS_RULES.checkout, ...fetchedRules.checkout },
          contact: { ...DEFAULT_BUSINESS_RULES.contact, ...fetchedRules.contact }
        });
      }
    } catch (err) {
      console.error('Error loading business rules:', err);
      toast.error('Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'business_rules')
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('app_settings')
          .update({
            setting_value: JSON.parse(JSON.stringify(rules)),
            description: 'Business rules for cart, wishlist, and checkout. Configurable from admin dashboard.',
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'business_rules');

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert([{
            setting_key: 'business_rules',
            setting_value: JSON.parse(JSON.stringify(rules)),
            description: 'Business rules for cart, wishlist, and checkout. Configurable from admin dashboard.'
          }]);

        if (insertError) throw insertError;
      }

      // Clear cache so new values are loaded
      clearBusinessRulesCache();
      
      toast.success('Règles sauvegardées', {
        description: 'Les nouvelles limites seront appliquées immédiatement.'
      });
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving business rules:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateCartRule = (key: keyof BusinessRules['cart'], value: number) => {
    setRules(prev => ({
      ...prev,
      cart: { ...prev.cart, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateWishlistRule = (key: keyof BusinessRules['wishlist'], value: number) => {
    setRules(prev => ({
      ...prev,
      wishlist: { ...prev.wishlist, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateCheckoutRule = (key: keyof BusinessRules['checkout'], value: boolean) => {
    setRules(prev => ({
      ...prev,
      checkout: { ...prev.checkout, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateContactRule = (key: keyof BusinessRules['contact'], value: string) => {
    setRules(prev => ({
      ...prev,
      contact: { ...prev.contact, [key]: value }
    }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Règles Métier
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configurez les limites et comportements du panier et de la liste de souhaits
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              Modifications non sauvegardées
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadRules} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button size="sm" onClick={saveRules} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cart Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Panier
            </CardTitle>
            <CardDescription>
              Limites et seuils pour le panier d'achat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxQuantityPerItem">Quantité max par article</Label>
              <Input
                id="maxQuantityPerItem"
                type="number"
                min={1}
                max={100}
                value={rules.cart.maxQuantityPerItem}
                onChange={(e) => updateCartRule('maxQuantityPerItem', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Au-delà, le client doit vous contacter directement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxProductTypes">Nombre max de produits différents</Label>
              <Input
                id="maxProductTypes"
                type="number"
                min={1}
                max={50}
                value={rules.cart.maxProductTypes}
                onChange={(e) => updateCartRule('maxProductTypes', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Limite le nombre de références dans le panier
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="highValueThreshold">Seuil commande VIP (€)</Label>
              <Input
                id="highValueThreshold"
                type="number"
                min={0}
                step={100}
                value={rules.cart.highValueThreshold}
                onChange={(e) => updateCartRule('highValueThreshold', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Affiche un message de contact personnalisé au-delà de ce montant
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Commande min (€)</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min={0}
                  value={rules.cart.minOrderAmount}
                  onChange={(e) => updateCartRule('minOrderAmount', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOrderAmount">Commande max (€)</Label>
                <Input
                  id="maxOrderAmount"
                  type="number"
                  min={0}
                  value={rules.cart.maxOrderAmount}
                  onChange={(e) => updateCartRule('maxOrderAmount', parseInt(e.target.value) || 10000)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wishlist Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Liste de Souhaits
            </CardTitle>
            <CardDescription>
              Limites pour les favoris
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wishlistMaxItems">Nombre max d'articles</Label>
              <Input
                id="wishlistMaxItems"
                type="number"
                min={1}
                max={100}
                value={rules.wishlist.maxItems}
                onChange={(e) => updateWishlistRule('maxItems', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Limite le nombre de produits dans les favoris
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Checkout
            </CardTitle>
            <CardDescription>
              Options de paiement et validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Vérification email obligatoire</Label>
                <p className="text-xs text-muted-foreground">
                  Requiert un email vérifié pour commander
                </p>
              </div>
              <Switch
                checked={rules.checkout.requireEmailVerification}
                onCheckedChange={(checked) => updateCheckoutRule('requireEmailVerification', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Checkout invité autorisé</Label>
                <p className="text-xs text-muted-foreground">
                  Permet de commander sans créer de compte
                </p>
              </div>
              <Switch
                checked={rules.checkout.allowGuestCheckout}
                onCheckedChange={(checked) => updateCheckoutRule('allowGuestCheckout', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Message VIP pour grosses commandes</Label>
                <p className="text-xs text-muted-foreground">
                  Affiche un message de contact pour les commandes VIP
                </p>
              </div>
              <Switch
                checked={rules.checkout.showVipContactForHighValue}
                onCheckedChange={(checked) => updateCheckoutRule('showVipContactForHighValue', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact VIP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contact VIP
            </CardTitle>
            <CardDescription>
              Coordonnées pour les commandes importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vipEmail">Email VIP</Label>
              <Input
                id="vipEmail"
                type="email"
                value={rules.contact.vipEmail}
                onChange={(e) => updateContactRule('vipEmail', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vipPhone">Téléphone VIP</Label>
              <Input
                id="vipPhone"
                type="tel"
                value={rules.contact.vipPhone}
                onChange={(e) => updateContactRule('vipPhone', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Note importante</p>
            <p className="text-sm text-amber-700">
              Les modifications sont appliquées immédiatement après la sauvegarde. 
              Les utilisateurs actuellement sur le site verront les nouvelles limites lors de leur prochaine action.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessRulesConfig;
