import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

// Major French cities + Belgian/Swiss/Luxembourg/Monaco cities
const CITIES_DB: [string, string, string][] = [
  // Nantes Métropole (shipping zone)
  ['44000', 'Nantes', 'FR'],
  ['44100', 'Nantes', 'FR'],
  ['44200', 'Nantes', 'FR'],
  ['44300', 'Nantes', 'FR'],
  ['44400', 'Rezé', 'FR'],
  ['44470', 'Carquefou', 'FR'],
  ['44800', 'Saint-Herblain', 'FR'],
  ['44900', 'Nantes', 'FR'],
  // Major French cities
  ['75001', 'Paris 1er', 'FR'],
  ['75002', 'Paris 2e', 'FR'],
  ['75003', 'Paris 3e', 'FR'],
  ['75004', 'Paris 4e', 'FR'],
  ['75005', 'Paris 5e', 'FR'],
  ['75006', 'Paris 6e', 'FR'],
  ['75007', 'Paris 7e', 'FR'],
  ['75008', 'Paris 8e', 'FR'],
  ['75009', 'Paris 9e', 'FR'],
  ['75010', 'Paris 10e', 'FR'],
  ['75011', 'Paris 11e', 'FR'],
  ['75012', 'Paris 12e', 'FR'],
  ['75013', 'Paris 13e', 'FR'],
  ['75014', 'Paris 14e', 'FR'],
  ['75015', 'Paris 15e', 'FR'],
  ['75016', 'Paris 16e', 'FR'],
  ['75017', 'Paris 17e', 'FR'],
  ['75018', 'Paris 18e', 'FR'],
  ['75019', 'Paris 19e', 'FR'],
  ['75020', 'Paris 20e', 'FR'],
  ['13001', 'Marseille', 'FR'],
  ['13002', 'Marseille', 'FR'],
  ['13003', 'Marseille', 'FR'],
  ['13004', 'Marseille', 'FR'],
  ['13005', 'Marseille', 'FR'],
  ['13006', 'Marseille', 'FR'],
  ['13007', 'Marseille', 'FR'],
  ['13008', 'Marseille', 'FR'],
  ['69001', 'Lyon 1er', 'FR'],
  ['69002', 'Lyon 2e', 'FR'],
  ['69003', 'Lyon 3e', 'FR'],
  ['69004', 'Lyon 4e', 'FR'],
  ['69005', 'Lyon 5e', 'FR'],
  ['69006', 'Lyon 6e', 'FR'],
  ['69007', 'Lyon 7e', 'FR'],
  ['69008', 'Lyon 8e', 'FR'],
  ['69009', 'Lyon 9e', 'FR'],
  ['31000', 'Toulouse', 'FR'],
  ['31100', 'Toulouse', 'FR'],
  ['31200', 'Toulouse', 'FR'],
  ['31300', 'Toulouse', 'FR'],
  ['31400', 'Toulouse', 'FR'],
  ['31500', 'Toulouse', 'FR'],
  ['06000', 'Nice', 'FR'],
  ['06100', 'Nice', 'FR'],
  ['06200', 'Nice', 'FR'],
  ['06300', 'Nice', 'FR'],
  ['33000', 'Bordeaux', 'FR'],
  ['33100', 'Bordeaux', 'FR'],
  ['33200', 'Bordeaux', 'FR'],
  ['33300', 'Bordeaux', 'FR'],
  ['67000', 'Strasbourg', 'FR'],
  ['67100', 'Strasbourg', 'FR'],
  ['67200', 'Strasbourg', 'FR'],
  ['59000', 'Lille', 'FR'],
  ['59100', 'Roubaix', 'FR'],
  ['59200', 'Tourcoing', 'FR'],
  ['59300', 'Valenciennes', 'FR'],
  ['34000', 'Montpellier', 'FR'],
  ['34070', 'Montpellier', 'FR'],
  ['34080', 'Montpellier', 'FR'],
  ['35000', 'Rennes', 'FR'],
  ['35200', 'Rennes', 'FR'],
  ['35700', 'Rennes', 'FR'],
  ['51100', 'Reims', 'FR'],
  ['76000', 'Rouen', 'FR'],
  ['76100', 'Rouen', 'FR'],
  ['42000', 'Saint-Étienne', 'FR'],
  ['42100', 'Saint-Étienne', 'FR'],
  ['21000', 'Dijon', 'FR'],
  ['37000', 'Tours', 'FR'],
  ['37100', 'Tours', 'FR'],
  ['38000', 'Grenoble', 'FR'],
  ['38100', 'Grenoble', 'FR'],
  ['49000', 'Angers', 'FR'],
  ['49100', 'Angers', 'FR'],
  ['63000', 'Clermont-Ferrand', 'FR'],
  ['63100', 'Clermont-Ferrand', 'FR'],
  ['80000', 'Amiens', 'FR'],
  ['29200', 'Brest', 'FR'],
  ['56000', 'Vannes', 'FR'],
  ['72000', 'Le Mans', 'FR'],
  ['14000', 'Caen', 'FR'],
  ['30000', 'Nîmes', 'FR'],
  ['84000', 'Avignon', 'FR'],
  ['57000', 'Metz', 'FR'],
  ['54000', 'Nancy', 'FR'],
  ['25000', 'Besançon', 'FR'],
  ['45000', 'Orléans', 'FR'],
  ['86000', 'Poitiers', 'FR'],
  ['87000', 'Limoges', 'FR'],
  ['68000', 'Colmar', 'FR'],
  ['68100', 'Mulhouse', 'FR'],
  ['64000', 'Pau', 'FR'],
  ['64100', 'Bayonne', 'FR'],
  ['17000', 'La Rochelle', 'FR'],
  ['10000', 'Troyes', 'FR'],
  ['90000', 'Belfort', 'FR'],
  ['01000', 'Bourg-en-Bresse', 'FR'],
  ['02000', 'Laon', 'FR'],
  ['03000', 'Moulins', 'FR'],
  ['04000', 'Digne-les-Bains', 'FR'],
  ['05000', 'Gap', 'FR'],
  ['07000', 'Privas', 'FR'],
  ['08000', 'Charleville-Mézières', 'FR'],
  ['09000', 'Foix', 'FR'],
  ['11000', 'Carcassonne', 'FR'],
  ['12000', 'Rodez', 'FR'],
  ['15000', 'Aurillac', 'FR'],
  ['16000', 'Angoulême', 'FR'],
  ['18000', 'Bourges', 'FR'],
  ['19000', 'Tulle', 'FR'],
  ['22000', 'Saint-Brieuc', 'FR'],
  ['23000', 'Guéret', 'FR'],
  ['24000', 'Périgueux', 'FR'],
  ['26000', 'Valence', 'FR'],
  ['27000', 'Évreux', 'FR'],
  ['28000', 'Chartres', 'FR'],
  ['29000', 'Quimper', 'FR'],
  ['32000', 'Auch', 'FR'],
  ['36000', 'Châteauroux', 'FR'],
  ['39000', 'Lons-le-Saunier', 'FR'],
  ['40000', 'Mont-de-Marsan', 'FR'],
  ['41000', 'Blois', 'FR'],
  ['43000', 'Le Puy-en-Velay', 'FR'],
  ['46000', 'Cahors', 'FR'],
  ['47000', 'Agen', 'FR'],
  ['48000', 'Mende', 'FR'],
  ['50000', 'Saint-Lô', 'FR'],
  ['52000', 'Chaumont', 'FR'],
  ['53000', 'Laval', 'FR'],
  ['55000', 'Bar-le-Duc', 'FR'],
  ['58000', 'Nevers', 'FR'],
  ['60000', 'Beauvais', 'FR'],
  ['61000', 'Alençon', 'FR'],
  ['62000', 'Arras', 'FR'],
  ['65000', 'Tarbes', 'FR'],
  ['66000', 'Perpignan', 'FR'],
  ['70000', 'Vesoul', 'FR'],
  ['71000', 'Mâcon', 'FR'],
  ['73000', 'Chambéry', 'FR'],
  ['74000', 'Annecy', 'FR'],
  ['77000', 'Melun', 'FR'],
  ['78000', 'Versailles', 'FR'],
  ['79000', 'Niort', 'FR'],
  ['81000', 'Albi', 'FR'],
  ['82000', 'Montauban', 'FR'],
  ['83000', 'Toulon', 'FR'],
  ['85000', 'La Roche-sur-Yon', 'FR'],
  ['88000', 'Épinal', 'FR'],
  ['89000', 'Auxerre', 'FR'],
  ['91000', 'Évry', 'FR'],
  ['92000', 'Nanterre', 'FR'],
  ['92100', 'Boulogne-Billancourt', 'FR'],
  ['92200', 'Neuilly-sur-Seine', 'FR'],
  ['93000', 'Bobigny', 'FR'],
  ['93100', 'Montreuil', 'FR'],
  ['93200', 'Saint-Denis', 'FR'],
  ['94000', 'Créteil', 'FR'],
  ['94200', 'Ivry-sur-Seine', 'FR'],
  ['95000', 'Cergy', 'FR'],
  // Corse
  ['20000', 'Ajaccio', 'FR'],
  ['20100', 'Sartène', 'FR'],
  ['20200', 'Bastia', 'FR'],
  ['20300', 'Calvi', 'FR'],
  // Belgium
  ['1000', 'Bruxelles', 'BE'],
  ['1050', 'Ixelles', 'BE'],
  ['1060', 'Saint-Gilles', 'BE'],
  ['1070', 'Anderlecht', 'BE'],
  ['1080', 'Molenbeek', 'BE'],
  ['1090', 'Jette', 'BE'],
  ['1200', 'Woluwe-Saint-Lambert', 'BE'],
  ['2000', 'Anvers', 'BE'],
  ['3000', 'Louvain', 'BE'],
  ['4000', 'Liège', 'BE'],
  ['5000', 'Namur', 'BE'],
  ['6000', 'Charleroi', 'BE'],
  ['7000', 'Mons', 'BE'],
  ['8000', 'Bruges', 'BE'],
  ['9000', 'Gand', 'BE'],
  // Switzerland
  ['1200', 'Genève', 'CH'],
  ['1000', 'Lausanne', 'CH'],
  ['3000', 'Berne', 'CH'],
  ['4000', 'Bâle', 'CH'],
  ['8000', 'Zurich', 'CH'],
  ['6900', 'Lugano', 'CH'],
  ['2000', 'Neuchâtel', 'CH'],
  ['1700', 'Fribourg', 'CH'],
  // Monaco
  ['98000', 'Monaco', 'MC'],
  // Luxembourg
  ['1000', 'Luxembourg', 'LU'],
  ['2000', 'Luxembourg', 'LU'],
  ['4000', 'Esch-sur-Alzette', 'LU'],
];

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  BE: '🇧🇪',
  CH: '🇨🇭',
  MC: '🇲🇨',
  LU: '🇱🇺',
};

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  MC: 'Monaco',
  LU: 'Luxembourg',
};

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
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];

    const results: AddressSuggestion[] = [];
    const seen = new Set<string>();

    for (const [postcode, city, countryCode] of CITIES_DB) {
      if (results.length >= 8) break;
      const key = `${postcode}-${city}-${countryCode}`;
      if (seen.has(key)) continue;

      const cityLower = city.toLowerCase();
      const matches =
        postcode.startsWith(query) ||
        cityLower.startsWith(query) ||
        cityLower.includes(query);

      if (matches) {
        seen.add(key);
        results.push({
          label: `${postcode} ${city}`,
          city,
          postcode,
          country: COUNTRY_NAMES[countryCode] || countryCode,
          countryCode,
        });
      }
    }

    return results;
  }, [value]);

  // Auto-open when suggestions change
  useEffect(() => {
    setIsOpen(suggestions.length > 0);
    setActiveIndex(-1);
  }, [suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.postcode);
    onSelect?.(suggestion);
    setIsOpen(false);
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
        if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current?.children[activeIndex]) {
      (listRef.current.children[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
              key={`${suggestion.postcode}-${suggestion.city}-${suggestion.countryCode}`}
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
                  {COUNTRY_FLAGS[suggestion.countryCode]} {suggestion.country}
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
