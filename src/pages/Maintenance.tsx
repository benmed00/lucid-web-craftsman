import { Wrench, Clock, Mail, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { format } from 'date-fns';
import { enUS, fr as frLocale } from 'date-fns/locale';

const Maintenance = () => {
  const { t, i18n } = useTranslation('pages');
  const { maintenanceReturnTime, maintenanceMessage } = useMaintenanceMode();
  const isFr = i18n.language?.startsWith('fr') ?? false;
  const dateLocale = isFr ? frLocale : enUS;
  const datePattern = isFr
    ? "EEEE d MMMM yyyy 'à' HH:mm"
    : "EEEE, MMMM d, yyyy 'at' HH:mm";

  const formatReturnTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return format(date, datePattern, { locale: dateLocale });
    } catch {
      return null;
    }
  };

  const formattedReturnTime = formatReturnTime(maintenanceReturnTime);

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
            {t('maintenance.title')}
          </h1>
          <p style={{ color: '#57534e' }}>
            {maintenanceMessage || t('maintenance.defaultMessage')}
          </p>
        </div>

        {/* Estimated time */}
        <div
          className="flex items-center justify-center gap-2"
          style={{ color: '#78716c' }}
        >
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {formattedReturnTime
              ? t('maintenance.returnExpected', {
                  time: formattedReturnTime,
                })
              : t('maintenance.backSoon')}
          </span>
        </div>

        {/* Return time card if available */}
        {formattedReturnTime && (
          <div
            className="rounded-lg p-4 flex items-center justify-center gap-3"
            style={{
              backgroundColor: '#ecfccb',
              border: '1px solid #bef264',
            }}
          >
            <Calendar className="h-5 w-5" style={{ color: '#65a30d' }} />
            <span className="text-sm font-medium" style={{ color: '#3f6212' }}>
              {formattedReturnTime}
            </span>
          </div>
        )}

        {/* Contact info */}
        <div
          className="rounded-lg p-4 shadow-sm"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e7e5e4',
          }}
        >
          <p className="text-sm mb-3" style={{ color: '#57534e' }}>
            {t('maintenance.urgentContact')}
          </p>
          <a
            href="mailto:contact@rifrawstraw.com"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: '#65a30d',
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <Mail className="h-4 w-4" />
            contact@rifrawstraw.com
          </a>
        </div>

        {/* Brand */}
        <p className="text-xs" style={{ color: '#a8a29e' }}>
          {t('maintenance.brandLine')}
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
