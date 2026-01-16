import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/stores/currencyStore";

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

interface PromoCodeExportProps {
  coupons: DiscountCoupon[];
}

const PromoCodeExport = ({ coupons }: PromoCodeExportProps) => {
  const { formatPrice } = useCurrency();
  const [isExporting, setIsExporting] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  };

  const getStatus = (coupon: DiscountCoupon) => {
    const now = new Date();
    if (!coupon.is_active) return "Désactivé";
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return "Expiré";
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return "Planifié";
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return "Limite atteinte";
    return "Actif";
  };

  const calculateEstimatedSavings = (coupon: DiscountCoupon) => {
    const avgOrderValue = 75;
    const usage = coupon.usage_count || 0;
    if (coupon.type === "percentage") {
      return formatPrice(avgOrderValue * (coupon.value / 100) * usage);
    }
    return formatPrice(coupon.value * usage);
  };

  const exportToCSV = () => {
    setIsExporting(true);

    try {
      // CSV Headers
      const headers = [
        "Code",
        "Type",
        "Valeur",
        "Statut",
        "Utilisations",
        "Limite",
        "Économies estimées (€)",
        "Commande minimum (€)",
        "Réduction max (€)",
        "Livraison gratuite",
        "Date début",
        "Date fin",
        "Créé le",
      ];

      // CSV Rows
      const rows = coupons.map((coupon) => [
        coupon.code,
        coupon.type === "percentage" ? "Pourcentage" : "Montant fixe",
        coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value}€`,
        getStatus(coupon),
        coupon.usage_count || 0,
        coupon.usage_limit || "Illimité",
        calculateEstimatedSavings(coupon),
        coupon.minimum_order_amount || "",
        coupon.maximum_discount_amount || "",
        coupon.includes_free_shipping ? "Oui" : "Non",
        formatDate(coupon.valid_from),
        formatDate(coupon.valid_until),
        formatDate(coupon.created_at),
      ]);

      // Calculate summary stats
      const totalCoupons = coupons.length;
      const activeCoupons = coupons.filter((c) => c.is_active).length;
      const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
      const totalSavings = coupons.reduce(
        (sum, c) => sum + parseFloat(calculateEstimatedSavings(c)),
        0
      );

      // Summary rows
      const summaryRows = [
        [],
        ["=== RÉSUMÉ ==="],
        ["Total codes", totalCoupons],
        ["Codes actifs", activeCoupons],
        ["Total utilisations", totalUsage],
        ["Économies totales estimées", formatPrice(totalSavings)],
        ["Date d'export", format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })],
      ];

      // Combine all rows
      const allRows = [headers, ...rows, ...summaryRows];

      // Convert to CSV string with proper escaping
      const csvContent = allRows
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell ?? "");
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",")
        )
        .join("\n");

      // Add BOM for Excel UTF-8 compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `codes-promo-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportToCSV} disabled={isExporting || coupons.length === 0}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Exporter CSV
    </Button>
  );
};

export default PromoCodeExport;
