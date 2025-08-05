import { useState } from "react";
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
import { toast } from "sonner";

// Mock marketing data
const mockCampaigns = [
  {
    id: 1,
    name: "Promotion Printemps 2024",
    type: "discount",
    status: "active",
    discount: 15,
    code: "PRINTEMPS15",
    startDate: "2024-03-01",
    endDate: "2024-03-31",
    usageCount: 23,
    usageLimit: 100,
    revenue: 445
  },
  {
    id: 2,
    name: "Newsletter Nouveautés",
    type: "newsletter",
    status: "sent",
    sentTo: 156,
    openRate: 24.3,
    clickRate: 3.2,
    sentDate: "2024-01-15"
  },
  {
    id: 3,
    name: "Code Première Commande",
    type: "discount",
    status: "active",
    discount: 10,
    code: "BIENVENUE10",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    usageCount: 8,
    usageLimit: null,
    revenue: 156
  }
];

const mockCustomerSegments = [
  { id: 1, name: "Clients VIP", count: 12, criteria: "Plus de 300€ d'achats" },
  { id: 2, name: "Nouveaux clients", count: 34, criteria: "Inscrits dans les 30 derniers jours" },
  { id: 3, name: "Clients inactifs", count: 18, criteria: "Aucun achat depuis 6 mois" },
  { id: 4, name: "Amateurs de sacs", count: 28, criteria: "Achats principalement en catégorie Sacs" }
];

const AdminMarketing = () => {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "discount",
    discount: 0,
    code: "",
    startDate: "",
    endDate: "",
    usageLimit: "",
    targetSegment: "all"
  });
  const [newsletterContent, setNewsletterContent] = useState({
    subject: "",
    content: "",
    targetSegment: "all"
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200";
      case "ended": return "bg-stone-100 text-stone-800 border-stone-200";
      case "sent": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "scheduled": return "Programmée";
      case "ended": return "Terminée";
      case "sent": return "Envoyée";
      default: return status;
    }
  };

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case "discount": return <Percent className="h-4 w-4" />;
      case "newsletter": return <Mail className="h-4 w-4" />;
      case "gift": return <Gift className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const handleCreateDiscount = () => {
    if (!newCampaign.name || !newCampaign.code || !newCampaign.discount) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const campaign = {
      id: Date.now(),
      ...newCampaign,
      type: "discount",
      status: "active",
      usageCount: 0,
      revenue: 0,
      usageLimit: newCampaign.usageLimit ? Number(newCampaign.usageLimit) : null
    };

    setCampaigns([...campaigns, campaign]);
    setNewCampaign({
      name: "",
      type: "discount",
      discount: 0,
      code: "",
      startDate: "",
      endDate: "",
      usageLimit: "",
      targetSegment: "all"
    });
    toast.success("Code de réduction créé avec succès");
  };

  const handleSendNewsletter = () => {
    if (!newsletterContent.subject || !newsletterContent.content) {
      toast.error("Veuillez remplir le sujet et le contenu");
      return;
    }

    const targetCount = newsletterContent.targetSegment === "all" ? 156 : 
                       mockCustomerSegments.find(s => s.id.toString() === newsletterContent.targetSegment)?.count || 0;

    const newsletter = {
      id: Date.now(),
      name: newsletterContent.subject,
      type: "newsletter",
      status: "sent",
      sentTo: targetCount,
      openRate: 0,
      clickRate: 0,
      sentDate: new Date().toISOString().split('T')[0]
    };

    setCampaigns([...campaigns, newsletter]);
    setNewsletterContent({ subject: "", content: "", targetSegment: "all" });
    toast.success(`Newsletter envoyée à ${targetCount} clients`);
  };

  const generateCode = () => {
    const code = newCampaign.name.toUpperCase().replace(/\s+/g, '').slice(0, 8) + newCampaign.discount;
    setNewCampaign({...newCampaign, code});
  };

  const DiscountDialog = () => (
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
            <Label htmlFor="campaignName">Nom de la campagne *</Label>
            <Input
              id="campaignName"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
              placeholder="ex: Promotion Été 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Réduction (%) *</Label>
            <Input
              id="discount"
              type="number"
              min="1"
              max="50"
              value={newCampaign.discount}
              onChange={(e) => setNewCampaign({...newCampaign, discount: Number(e.target.value)})}
              placeholder="15"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code promo *</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={newCampaign.code}
              onChange={(e) => setNewCampaign({...newCampaign, code: e.target.value.toUpperCase()})}
              placeholder="PROMO15"
              className="flex-1"
            />
            <Button variant="outline" onClick={generateCode}>
              Générer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Date de début</Label>
            <Input
              id="startDate"
              type="date"
              value={newCampaign.startDate}
              onChange={(e) => setNewCampaign({...newCampaign, startDate: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Date de fin</Label>
            <Input
              id="endDate"
              type="date"
              value={newCampaign.endDate}
              onChange={(e) => setNewCampaign({...newCampaign, endDate: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usageLimit">Limite d'utilisation</Label>
            <Input
              id="usageLimit"
              type="number"
              value={newCampaign.usageLimit}
              onChange={(e) => setNewCampaign({...newCampaign, usageLimit: e.target.value})}
              placeholder="100 (optionnel)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetSegment">Public cible</Label>
            <select 
              value={newCampaign.targetSegment}
              onChange={(e) => setNewCampaign({...newCampaign, targetSegment: e.target.value})}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="all">Tous les clients</option>
              {mockCustomerSegments.map(segment => (
                <option key={segment.id} value={segment.id.toString()}>
                  {segment.name} ({segment.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleCreateDiscount} className="w-full bg-olive-700 hover:bg-olive-800">
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
            <option value="all">Tous les clients (156)</option>
            {mockCustomerSegments.map(segment => (
              <option key={segment.id} value={segment.id.toString()}>
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
          <DiscountDialog />
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
            {mockCustomerSegments.map((segment) => (
              <div key={segment.id} className="p-4 border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-stone-800">{segment.name}</h4>
                  <Badge variant="outline">{segment.count} clients</Badge>
                </div>
                <p className="text-sm text-stone-600">{segment.criteria}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Megaphone className="h-5 w-5 mr-2 text-olive-600" />
              Campagnes actives
            </div>
            <Badge variant="outline">{campaigns.filter(c => c.status === 'active').length} actives</Badge>
          </CardTitle>
          <CardDescription>
            Vos promotions et newsletters en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 border border-stone-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-stone-100 rounded-lg">
                      {getCampaignIcon(campaign.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-stone-800">{campaign.name}</h4>
                        <Badge className={getStatusColor(campaign.status)}>
                          {getStatusText(campaign.status)}
                        </Badge>
                      </div>
                      
                      {campaign.type === "discount" && (
                        <div className="space-y-1">
                          <p className="text-sm text-stone-600">
                            Code: <span className="font-mono bg-stone-100 px-2 py-1 rounded">{campaign.code}</span>
                            • Réduction: {campaign.discount}%
                          </p>
                          <p className="text-sm text-stone-600">
                            Utilisé {campaign.usageCount} fois
                            {campaign.usageLimit && ` / ${campaign.usageLimit}`}
                            • Revenus générés: {campaign.revenue}€
                          </p>
                          {campaign.endDate && (
                            <p className="text-sm text-stone-600">
                              Fin: {new Date(campaign.endDate).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      )}

                      {campaign.type === "newsletter" && (
                        <div className="space-y-1">
                          <p className="text-sm text-stone-600">
                            Envoyée à {campaign.sentTo} clients
                          </p>
                          <div className="flex space-x-4 text-sm">
                            <span className="text-green-600">
                              📈 Taux d'ouverture: {campaign.openRate}%
                            </span>
                            <span className="text-blue-600">
                              🔗 Taux de clic: {campaign.clickRate}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
                18 clients n'ont pas commandé depuis 6 mois. Une promotion ciblée pourrait les reconquérir.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📧 Performance email</h4>
              <p className="text-sm text-blue-700">
                Votre taux d'ouverture de 24% est excellent ! Continuez avec du contenu de qualité.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🎯 Segmentation</h4>
              <p className="text-sm text-purple-700">
                Vos clients VIP représentent 40% de votre CA. Créez des offres exclusives pour les fidéliser.
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">🆕 Nouveaux clients</h4>
              <p className="text-sm text-orange-700">
                34 nouveaux clients ce mois ! Pensez à un email de bienvenue avec un code de réduction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarketing;