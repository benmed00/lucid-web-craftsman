import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  Truck,
  Loader2,
  Copy,
  Check,
  List,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PromoCodeStats from "@/components/admin/PromoCodeStats";
import PromoCodeExport from "@/components/admin/PromoCodeExport";
import PromoAlertChecker from "@/components/admin/PromoAlertChecker";

interface DiscountCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  includes_free_shipping: boolean;
  created_at: string;
}

interface FreeShippingSettings {
  amount: number;
  enabled: boolean;
}

const AdminPromoCodes = () => {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Free shipping threshold settings
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings>({
    amount: 100,
    enabled: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: 0,
    minimum_order_amount: "",
    maximum_discount_amount: "",
    valid_from: "",
    valid_until: "",
    usage_limit: "",
    per_user_limit: "1",
    includes_free_shipping: false,
    is_active: true,
  });

  useEffect(() => {
    fetchCoupons();
    fetchFreeShippingSettings();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Erreur lors du chargement des codes promo");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFreeShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'free_shipping_threshold')
        .maybeSingle();

      if (error) throw error;
      if (data?.setting_value) {
        const settingValue = data.setting_value as unknown as FreeShippingSettings;
        setFreeShippingSettings(settingValue);
      }
    } catch (error) {
      console.error("Error fetching free shipping settings:", error);
    }
  };

  const saveFreeShippingSettings = async () => {
    setIsSavingSettings(true);
    try {
      // First check if setting exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'free_shipping_threshold')
        .maybeSingle();

      const settingValueJson = JSON.parse(JSON.stringify(freeShippingSettings));

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: settingValueJson,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'free_shipping_threshold');

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('app_settings')
          .insert([{
            setting_key: 'free_shipping_threshold',
            setting_value: settingValueJson,
            description: 'Seuil pour la livraison gratuite automatique'
          }]);

        if (error) throw error;
      }

      toast.success("Paramètres de livraison gratuite enregistrés");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: 0,
      minimum_order_amount: "",
      maximum_discount_amount: "",
      valid_from: "",
      valid_until: "",
      usage_limit: "",
      per_user_limit: "1",
      includes_free_shipping: false,
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const openEditDialog = (coupon: DiscountCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minimum_order_amount: coupon.minimum_order_amount?.toString() || "",
      maximum_discount_amount: coupon.maximum_discount_amount?.toString() || "",
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : "",
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : "",
      usage_limit: coupon.usage_limit?.toString() || "",
      per_user_limit: coupon.per_user_limit?.toString() || "1",
      includes_free_shipping: coupon.includes_free_shipping || false,
      is_active: coupon.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast.error("Le code est requis");
      return;
    }
    if (formData.value <= 0) {
      toast.error("La valeur doit être supérieure à 0");
      return;
    }

    setIsSaving(true);

    try {
      const couponData = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: formData.value,
        minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : null,
        maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: formData.per_user_limit ? parseInt(formData.per_user_limit) : 1,
        includes_free_shipping: formData.includes_free_shipping,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('discount_coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast.success("Code promo mis à jour");
      } else {
        const { error } = await supabase
          .from('discount_coupons')
          .insert(couponData);

        if (error) throw error;
        toast.success("Code promo créé");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      if (error.code === '23505') {
        toast.error("Ce code existe déjà");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCouponStatus = async (coupon: DiscountCoupon) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      
      setCoupons(coupons.map(c => 
        c.id === coupon.id ? { ...c, is_active: !c.is_active } : c
      ));
      
      toast.success(coupon.is_active ? "Code désactivé" : "Code activé");
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const deleteCoupon = async (coupon: DiscountCoupon) => {
    if (!confirm(`Supprimer le code "${coupon.code}" ?`)) return;

    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', coupon.id);

      if (error) throw error;
      
      setCoupons(coupons.filter(c => c.id !== coupon.id));
      toast.success("Code promo supprimé");
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (coupon: DiscountCoupon) => {
    if (coupon.type === 'percentage') {
      return `-${coupon.value}%`;
    }
    return `-${coupon.value.toFixed(2)} €`;
  };

  const getStatusBadge = (coupon: DiscountCoupon) => {
    const now = new Date();
    
    if (!coupon.is_active) {
      return <Badge variant="secondary">Désactivé</Badge>;
    }
    
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return <Badge variant="outline">Planifié</Badge>;
    }
    
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return <Badge variant="destructive">Limite atteinte</Badge>;
    }
    
    return <Badge className="bg-primary">Actif</Badge>;
  };

  // Stats
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Codes Promo</h1>
          <p className="text-muted-foreground">Gérez vos codes promotionnels et réductions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PromoCodeExport coupons={coupons} />
          <PromoAlertChecker />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau code
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Modifier le code" : "Nouveau code promo"}
              </DialogTitle>
              <DialogDescription>
                {editingCoupon 
                  ? "Modifiez les détails du code promo" 
                  : "Créez un nouveau code promotionnel"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PROMO2024"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  Valeur * ({formData.type === 'percentage' ? '%' : '€'})
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step={formData.type === 'percentage' ? '1' : '0.01'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum_order_amount">Commande minimum (€)</Label>
                  <Input
                    id="minimum_order_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maximum_discount_amount">Réduction max (€)</Label>
                  <Input
                    id="maximum_discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maximum_discount_amount}
                    onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Date début</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Date fin</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usage_limit">Limite d'utilisation</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="0"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="per_user_limit">Par utilisateur</Label>
                  <Input
                    id="per_user_limit"
                    type="number"
                    min="1"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Livraison gratuite incluse</Label>
                  <p className="text-xs text-muted-foreground">Offre la livraison avec ce code</p>
                </div>
                <Switch
                  checked={formData.includes_free_shipping}
                  onCheckedChange={(checked) => setFormData({ ...formData, includes_free_shipping: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Code actif</Label>
                  <p className="text-xs text-muted-foreground">Peut être utilisé par les clients</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingCoupon ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Tabs for Stats and List */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Liste des codes
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiques détaillées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <PromoCodeStats coupons={coupons} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total codes</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coupons.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actifs</CardTitle>
                <Check className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCoupons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisations</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsage}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Seuil livraison gratuite</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {freeShippingSettings.enabled ? `${freeShippingSettings.amount} €` : "Désactivé"}
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Free Shipping Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Livraison gratuite automatique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={freeShippingSettings.enabled}
                onCheckedChange={(checked) => 
                  setFreeShippingSettings({ ...freeShippingSettings, enabled: checked })
                }
              />
              <Label>Activer</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Seuil de commande (€)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                step="1"
                value={freeShippingSettings.amount}
                onChange={(e) => 
                  setFreeShippingSettings({ 
                    ...freeShippingSettings, 
                    amount: parseFloat(e.target.value) || 0 
                  })
                }
                className="w-32"
                disabled={!freeShippingSettings.enabled}
              />
            </div>
            <Button onClick={saveFreeShippingSettings} disabled={isSavingSettings}>
              {isSavingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enregistrer
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            La livraison sera gratuite pour les commandes supérieures à ce montant
          </p>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des codes promo</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun code promo</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Créer votre premier code
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(coupon.code)}
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDiscount(coupon)}</span>
                        {coupon.includes_free_shipping && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Livraison offerte
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {coupon.minimum_order_amount 
                          ? `Min. ${coupon.minimum_order_amount}€` 
                          : "Aucune"}
                        {coupon.maximum_discount_amount && (
                          <span className="block">Max. -{coupon.maximum_discount_amount}€</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {coupon.valid_from && (
                          <span>Du {format(new Date(coupon.valid_from), 'dd/MM/yyyy', { locale: fr })}</span>
                        )}
                        {coupon.valid_until && (
                          <span className="block">Au {format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: fr })}</span>
                        )}
                        {!coupon.valid_from && !coupon.valid_until && (
                          <span className="text-muted-foreground">Illimité</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {coupon.usage_count} / {coupon.usage_limit || "∞"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(coupon)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleCouponStatus(coupon)}
                        >
                          <Switch checked={coupon.is_active} className="pointer-events-none" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteCoupon(coupon)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPromoCodes;