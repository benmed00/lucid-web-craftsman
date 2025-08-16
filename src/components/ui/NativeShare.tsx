import { Share, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface NativeShareProps {
  title: string;
  text: string;
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NativeShare = ({ title, text, url, isOpen, onClose }: NativeShareProps) => {
  const [isSharing, setIsSharing] = useState(false);
  
  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    setIsSharing(true);
    
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      
      toast({
        title: "Partagé avec succès",
        description: "Le produit a été partagé",
      });
      
      onClose();
    } catch (error) {
      console.log('Share cancelled or failed:', error);
      // Don't show error for user cancellation
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié",
        description: "Le lien a été copié dans le presse-papier",
      });
      onClose();
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${text}\n\n${url}`)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleSMSShare = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(`${title}\n\n${text}\n\n${url}`)}`;
    window.open(smsUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Partager ce produit</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {/* Native Share Button */}
          {navigator.share && (
            <Button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="w-full bg-olive-700 hover:bg-olive-800 text-white justify-start"
            >
              <Share className="mr-3 h-4 w-4" />
              {isSharing ? 'Partage en cours...' : 'Partager'}
            </Button>
          )}

          {/* Copy Link */}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start"
          >
            <Copy className="mr-3 h-4 w-4" />
            Copier le lien
          </Button>

          {/* WhatsApp */}
          <Button
            onClick={handleWhatsAppShare}
            variant="outline"
            className="w-full justify-start"
          >
            <MessageCircle className="mr-3 h-4 w-4" />
            Partager sur WhatsApp
          </Button>

          {/* SMS */}
          <Button
            onClick={handleSMSShare}
            variant="outline"
            className="w-full justify-start"
          >
            <MessageCircle className="mr-3 h-4 w-4" />
            Envoyer par SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};