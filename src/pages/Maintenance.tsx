import { Wrench, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-olive-100 rounded-full flex items-center justify-center">
            <Wrench className="h-10 w-10 text-olive-600" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-semibold text-stone-800">
            Site en maintenance
          </h1>
          <p className="text-stone-600">
            Nous effectuons actuellement des travaux de maintenance pour améliorer votre expérience.
          </p>
        </div>

        {/* Estimated time */}
        <div className="flex items-center justify-center gap-2 text-stone-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Nous serons de retour très bientôt</span>
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-stone-200">
          <p className="text-sm text-stone-600 mb-3">
            Pour toute question urgente, contactez-nous :
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "mailto:contact@rifrawstraw.com"}
          >
            <Mail className="h-4 w-4 mr-2" />
            contact@rifrawstraw.com
          </Button>
        </div>

        {/* Brand */}
        <p className="text-xs text-stone-400">
          Rif Raw Straw — Artisanat berbère authentique
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
