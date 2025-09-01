import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Megaphone, 
  Mail,
  Gift,
  Percent,
  Calendar,
  Users,
  Eye,
  Plus,
  Edit,
  Trash2,
  Send,
  Target,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewsletterSubscription {
  id: string;
  email: string;
  status: string;
  created_at: string;
  source: string | null;
  tags: string[] | null;
}

interface DiscountCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minimum_order_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  usage_count: number;
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
}

interface CustomerSegment {
  id: string;
  name: string;
  count: number;
  criteria: string;
}

interface MarketingData {
  newsletters: NewsletterSubscription[];
  coupons: DiscountCoupon[];
  segments: CustomerSegment[];
  campaigns: any[];
}

const AdminMarketing = () => {
  const [marketingData, setMarketingData] = useState<MarketingData>({
    newsletters: [],
    coupons: [],
    segments: [],
    campaigns: []
  });
  const [loading, setLoading] = useState(true);
  
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "percentage",
    value: 0,
    minimumAmount: 0,
    validFrom: "",
    validUntil: "",
    usageLimit: "",
  });
  
  const [newsletterContent, setNewsletterContent] = useState({
    subject: "",
    content: "",
    targetSegment: "all"
  });

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      
      // Fetch newsletter subscriptions
      const { data: newsletters, error: newsletterError } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (newsletterError) throw newsletterError;

      // Fetch discount coupons
      const { data: coupons, error: couponsError } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (couponsError) throw couponsError;

      // Get customer segments using the database function
      const { data: segmentsData, error: segmentsError } = await supabase
        .rpc('get_customer_segments');
      
      let customerSegments: CustomerSegment[] = [];
      
      if (!segmentsError && segmentsData) {
        // Type assertion for the RPC response
        const segments = segmentsData as { total: number; new: number; returning: number; at_risk: number };
        
        // Convert the database result to CustomerSegment format
        customerSegments = [
          { 
            id: "total", 
            name: "Tous les clients", 
            count: segments.total || 0, 
            criteria: "Tous les clients enregistrés" 
          },
          { 
            id: "new", 
            name: "Nouveaux clients", 
            count: segments.new || 0, 
            criteria: "Inscrits dans les 30 derniers jours" 
          },
          { 
            id: "returning", 
            name: "Clients fidèles", 
            count: segments.returning || 0, 
            criteria: "Plus d'une commande" 
          },
          { 
            id: "at_risk", 
            name: "Clients à risque", 
            count: segments.at_risk || 0, 
            criteria: "Aucun achat depuis 90 jours" 
          }
        ];
      } else if (segmentsError) {
        console.error('Error fetching customer segments:', segmentsError);
        // Fallback segments
        customerSegments = [
          { id: "total", name: "Tous les clients", count: 0, criteria: "Tous les clients enregistrés" },
          { id: "new", name: "Nouveaux clients", count: 0, criteria: "Inscrits dans les 30 derniers jours" },
          { id: "returning", name: "Clients fidèles", count: 0, criteria: "Plus d'une commande" },
          { id: "at_risk", name: "Clients à risque", count: 0, criteria: "Aucun achat depuis 90 jours" }
        ];
      }

      setMarketingData({
        newsletters: newsletters || [],
        coupons: coupons || [],
        segments: customerSegments,
        campaigns: [] // This could be expanded in the future
      });
      
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      toast.error('Erreur lors du chargement des données marketing');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.value) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .insert({
          code: newCoupon.code.toUpperCase(),
          type: newCoupon.type,
          value: newCoupon.value,
          minimum_order_amount: newCoupon.minimumAmount || null,
          valid_from: newCoupon.validFrom || new Date().toISOString(),
          valid_until: newCoupon.validUntil || null,
          usage_limit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setMarketingData(prev => ({
        ...prev,
        coupons: [data, ...prev.coupons]
      }));
      
      setNewCoupon({
        code: "",
        type: "percentage",
        value: 0,
        minimumAmount: 0,
        validFrom: "",
        validUntil: "",
        usageLimit: "",
      });
      toast.success("Code de réduction créé avec succès");
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Erreur lors de la création du code de réduction');
    }
  };

  const handleSendNewsletter = () => {
    if (!newsletterContent.subject || !newsletterContent.content) {
      toast.error("Veuillez remplir le sujet et le contenu");
      return;
    }

    const targetSegment = marketingData.segments.find(s => s.id === newsletterContent.targetSegment);
    const targetCount = targetSegment ? targetSegment.count : marketingData.newsletters.length;

    toast.success(`Newsletter programmée pour ${targetCount} destinataires`);
    setNewsletterContent({ subject: "", content: "", targetSegment: "all" });
  };

  const generateCode = () => {
    const randomCode = 'PROMO' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setNewCoupon({...newCoupon, code: randomCode});
  };

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code de réduction ?')) return;

    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      setMarketingData(prev => ({
        ...prev,
        coupons: prev.coupons.filter(c => c.id !== couponId)
      }));
      toast.success('Code de réduction supprimé');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-stone-800">
              Marketing et promotions
            </h2>
            <p className="text-stone-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const CouponDialog = () => (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Créer un code de réduction</DialogTitle>
        <DialogDescription>
          Configurez votre promotion pour attirer et fidéliser vos clients
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="couponCode">Code promo *</Label>
            <div className="flex gap-2">
              <Input
                id="couponCode"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                placeholder="PROMO15"
                className="flex-1"
              />
              <Button variant="outline" onClick={generateCode}>
                Générer
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="couponValue">Valeur *</Label>
            <Input
              id="couponValue"
              type="number"
              min="1"
              value={newCoupon.value}
              onChange={(e) => setNewCoupon({...newCoupon, value: Number(e.target.value)})}
              placeholder="15"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="couponType">Type</Label>
            <select 
              value={newCoupon.type}
              onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value})}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="percentage">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumAmount">Montant minimum (€)</Label>
            <Input
              id="minimumAmount"
              type="number"
              min="0"
              value={newCoupon.minimumAmount}
              onChange={(e) => setNewCoupon({...newCoupon, minimumAmount: Number(e.target.value)})}
              placeholder="50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Date de début</Label>
            <Input
              id="validFrom"
              type="date"
              value={newCoupon.validFrom}
              onChange={(e) => setNewCoupon({...newCoupon, validFrom: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Date de fin</Label>
            <Input
              id="validUntil"
              type="date"
              value={newCoupon.validUntil}
              onChange={(e) => setNewCoupon({...newCoupon, validUntil: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="usageLimit">Limite d'utilisation</Label>
          <Input
            id="usageLimit"
            type="number"
            value={newCoupon.usageLimit}
            onChange={(e) => setNewCoupon({...newCoupon, usageLimit: e.target.value})}
            placeholder="100 (optionnel)"
          />
        </div>

        <Button onClick={handleCreateCoupon} className="w-full bg-olive-700 hover:bg-olive-800">
          <Percent className="h-4 w-4 mr-2" />
          Créer le code de réduction
        </Button>
      </div>
    </DialogContent>
  );

  const NewsletterDialog = () => (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Envoyer une newsletter</DialogTitle>
        <DialogDescription>
          Communiquez avec vos clients par email
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Sujet de l'email *</Label>
          <Input
            id="subject"
            value={newsletterContent.subject}
            onChange={(e) => setNewsletterContent({...newsletterContent, subject: e.target.value})}
            placeholder="Découvrez nos nouveautés printemps"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Contenu de l'email *</Label>
          <Textarea
            id="content"
            value={newsletterContent.content}
            onChange={(e) => setNewsletterContent({...newsletterContent, content: e.target.value})}
            placeholder="Chers clients, nous sommes heureux de vous présenter..."
            rows={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newsletterTarget">Public cible</Label>
          <select 
            value={newsletterContent.targetSegment}
            onChange={(e) => setNewsletterContent({...newsletterContent, targetSegment: e.target.value})}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option value="all">Tous les clients ({marketingData.newsletters.length})</option>
            {marketingData.segments.map(segment => (
              <option key={segment.id} value={segment.id}>
                {segment.name} ({segment.count})
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleSendNewsletter} className="w-full bg-blue-700 hover:bg-blue-800">
          <Send className="h-4 w-4 mr-2" />
          Envoyer la newsletter
        </Button>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-stone-800">
            Marketing et promotions
          </h2>
          <p className="text-stone-600">
            Gérez vos campagnes et communiquez avec vos clients
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-olive-100 rounded-lg">
                    <Percent className="h-6 w-6 text-olive-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800">Créer un code de réduction</h3>
                    <p className="text-sm text-stone-600">Lancez une promotion pour stimuler les ventes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <CouponDialog />
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800">Envoyer une newsletter</h3>
                    <p className="text-sm text-stone-600">Communiquez vos actualités à vos clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <NewsletterDialog />
        </Dialog>
      </div>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Segments de clientèle
          </CardTitle>
          <CardDescription>
            Groupes de clients pour vos campagnes ciblées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketingData.segments.map((segment) => (
              <div key={segment.id} className="p-4 border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-stone-800">{segment.name}</h4>
                  <Badge variant="outline">{segment.count} clients</Badge>
                </div>
                <p className="text-sm text-stone-600">{segment.criteria}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Newsletter</h4>
            <p className="text-sm text-blue-700">{marketingData.newsletters.length} abonnés actifs à votre newsletter</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Discount Coupons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Percent className="h-5 w-5 mr-2 text-olive-600" />
              Codes de réduction
            </div>
            <Badge variant="outline">{marketingData.coupons.filter(c => c.is_active).length} actifs</Badge>
          </CardTitle>
          <CardDescription>
            Vos codes promotionnels et leur utilisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketingData.coupons.length === 0 ? (
              <div className="text-center py-8 text-stone-600">
                Aucun code de réduction créé. Créez votre premier code pour stimuler les ventes.
              </div>
            ) : (
              marketingData.coupons.map((coupon) => (
                <div key={coupon.id} className="p-4 border border-stone-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-stone-800">
                          Code: <span className="font-mono bg-stone-100 px-2 py-1 rounded">{coupon.code}</span>
                        </h4>
                        <Badge className={coupon.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-stone-100 text-stone-800 border-stone-200"}>
                          {coupon.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-stone-600">
                          {coupon.type === 'percentage' ? `${coupon.value}% de réduction` : `${coupon.value}€ de réduction`}
                          {coupon.minimum_order_amount && ` • Minimum ${coupon.minimum_order_amount}€`}
                        </p>
                        <p className="text-sm text-stone-600">
                          Utilisé {coupon.usage_count} fois
                          {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                        </p>
                        {coupon.valid_until && (
                          <p className="text-sm text-stone-600">
                            Expire le: {new Date(coupon.valid_until).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCoupon(coupon.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marketing Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Insights marketing
          </CardTitle>
          <CardDescription>
            Recommandations pour améliorer vos campagnes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">💰 Opportunité de vente</h4>
              <p className="text-sm text-green-700">
                {marketingData.segments.find(s => s.id === 'at_risk')?.count || 0} clients n'ont pas commandé récemment. 
                Une promotion ciblée pourrait les reconquérir.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📧 Performance email</h4>
              <p className="text-sm text-blue-700">
                Votre base de {marketingData.newsletters.length} abonnés est prête pour vos campagnes !
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🎯 Segmentation</h4>
              <p className="text-sm text-purple-700">
                {marketingData.segments.find(s => s.id === 'returning')?.count || 0} clients fidèles. 
                Créez des offres exclusives pour les récompenser.
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">🆕 Nouveaux clients</h4>
              <p className="text-sm text-orange-700">
                {marketingData.segments.find(s => s.id === 'new')?.count || 0} nouveaux clients ce mois ! 
                Pensez à un email de bienvenue avec une offre spéciale.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarketing;