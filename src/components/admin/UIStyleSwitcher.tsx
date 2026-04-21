import { useUIStyleStore, type UIStyle } from '@/stores/uiStyleStore';
import { Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';

const options: { value: UIStyle; label: string }[] = [
  { value: 'modern', label: 'Moderne' },
  { value: 'legacy', label: 'Classique' },
];

const UIStyleSwitcher = () => {
  const uiStyle = useUIStyleStore((s) => s.uiStyle);
  const setUIStyle = useUIStyleStore((s) => s.setUIStyle);

  return (
    <div className="flex items-center gap-2">
      <Paintbrush className="h-4 w-4 text-muted-foreground" />
      <div className="flex rounded-lg border border-border overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setUIStyle(opt.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              uiStyle === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UIStyleSwitcher;
