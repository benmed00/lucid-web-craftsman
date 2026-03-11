import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  country: string;
  countryCode: string;
}

interface PostalCodeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const SUPPORTED_COUNTRIES: AddressSuggestion[] = [
  { label: '', city: '', postcode: '', country: 'France', countryCode: 'FR' },
  { label: '', city: '', postcode: '', country: 'Belgique', countryCode: 'BE' },
  { label: '', city: '', postcode: '', country: 'Suisse', countryCode: 'CH' },
  { label: '', city: '', postcode: '', country: 'Monaco', countryCode: 'MC' },
  { label: '', city: '', postcode: '', country: 'Luxembourg', countryCode: 'LU' },
];

const PostalCodeAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Code postal ou ville...',
  className,
  id,
  name,
  ...ariaProps
}: PostalCodeAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use French government API for address autocomplete
      const isNumeric = /^\d+$/.test(query.trim());
      const type = isNumeric ? 'municipality' : 'municipality';
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=${type}&limit=6&autocomplete=1`;

      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('API error');

      const data = await response.json();

      const results: AddressSuggestion[] = (data.features || []).map(
        (feature: { properties: { city?: string; postcode?: string; label?: string; name?: string } }) => {
          const props = feature.properties;
          return {
            label: `${props.postcode || ''} ${props.city || props.name || ''}`.trim(),
            city: props.city || props.name || '',
            postcode: props.postcode || '',
            country: 'France',
            countryCode: 'FR',
          };
        }
      );

      // Deduplicate by postcode+city
      const unique = results.filter(
        (item, index, self) =>
          index === self.findIndex((s) => s.postcode === item.postcode && s.city === item.city)
      );

      setSuggestions(unique);
      setIsOpen(unique.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.postcode);
    onSelect?.(suggestion);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[activeIndex]) {
        (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full px-3 py-2 pl-9 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm',
            className
          )}
          id={id}
          name={name}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="postal-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          autoComplete="off"
          {...ariaProps}
        />
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="postal-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.postcode}-${suggestion.city}`}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors',
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">
                  {suggestion.postcode} — {suggestion.city}
                </span>
                <span className="text-xs text-muted-foreground">
                  🇫🇷 {suggestion.country}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PostalCodeAutocomplete;
