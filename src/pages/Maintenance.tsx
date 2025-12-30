import { Wrench, Clock, Mail } from "lucide-react";

const Maintenance = () => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: 'linear-gradient(to bottom, #fafaf9, #f5f5f4)',
      }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#ecfccb' }}
          >
            <Wrench className="h-10 w-10" style={{ color: '#65a30d' }} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 
            className="text-3xl font-serif font-semibold"
            style={{ color: '#292524' }}
          >
            Site en maintenance
          </h1>
          <p style={{ color: '#57534e' }}>
            Nous effectuons actuellement des travaux de maintenance pour améliorer votre expérience.
          </p>
        </div>

        {/* Estimated time */}
        <div className="flex items-center justify-center gap-2" style={{ color: '#78716c' }}>
          <Clock className="h-4 w-4" />
          <span className="text-sm">Nous serons de retour très bientôt</span>
        </div>

        {/* Contact info */}
        <div 
          className="rounded-lg p-4 shadow-sm"
          style={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e7e5e4'
          }}
        >
          <p className="text-sm mb-3" style={{ color: '#57534e' }}>
            Pour toute question urgente, contactez-nous :
          </p>
          <a
            href="mailto:contact@rifrawstraw.com"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ 
              backgroundColor: '#65a30d',
              color: '#ffffff',
              textDecoration: 'none'
            }}
          >
            <Mail className="h-4 w-4" />
            contact@rifrawstraw.com
          </a>
        </div>

        {/* Brand */}
        <p className="text-xs" style={{ color: '#a8a29e' }}>
          Rif Raw Straw — Artisanat berbère authentique
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
