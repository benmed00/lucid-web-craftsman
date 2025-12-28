import { useState, useRef } from 'react';
import { Search, X, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const VoiceSearch = ({
  onSearch,
  placeholder = "Rechercher des produits...",
  className = ""
}: VoiceSearchProps) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useState(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        onSearch(transcript);
        
        toast({
          title: "Recherche vocale",
          description: `Recherche pour: "${transcript}"`,
        });
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = "Erreur de reconnaissance vocale";
        switch (event.error) {
          case 'no-speech':
            errorMessage = "Aucun son détecté. Essayez de parler plus fort.";
            break;
          case 'audio-capture':
            errorMessage = "Microphone non disponible.";
            break;
          case 'not-allowed':
            errorMessage = "Permission microphone refusée.";
            break;
        }
        
        toast({
          title: "Erreur vocale",
          description: errorMessage,
          variant: "destructive"
        });
        
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setIsSupported(true);
    }
  });

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return;

    try {
      // Request microphone permission on mobile
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      recognitionRef.current.start();
      
      toast({
        title: "Écoute en cours...",
        description: "Dites ce que vous recherchez",
      });
    } catch (error) {
      console.error('Microphone access error:', error);
      toast({
        title: "Erreur microphone",
        description: "Impossible d'accéder au microphone",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const clearSearch = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-20 h-12 bg-background border-border focus:border-primary focus:ring-primary rounded-xl"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
              <X className="h-4 w-4 text-stone-400" />
            </Button>
          )}
          
          {isSupported && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={isListening ? stopListening : startListening}
              className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
                isListening 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'
              }`}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Voice indicator */}
      {isListening && (
        <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            Écoute en cours...
          </div>
        </div>
      )}
    </form>
  );
};