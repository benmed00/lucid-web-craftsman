import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency, Currency } from '@/context/CurrencyContext';

const CurrencySelector: React.FC = () => {
  const { currency, setCurrency } = useCurrency();

  const currencies: { value: Currency; label: string; flag: string }[] = [
    { value: 'EUR', label: 'EUR (€)', flag: '🇪🇺' },
    { value: 'USD', label: 'USD ($)', flag: '🇺🇸' },
    { value: 'GBP', label: 'GBP (£)', flag: '🇬🇧' }
  ];

  return (
    <Select value={currency} onValueChange={(value: Currency) => setCurrency(value)}>
      <SelectTrigger 
        className="w-[140px] bg-white border-stone-200 hover:border-olive-300 transition-colors"
        aria-label="Sélectionner la devise"
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            <span>{currencies.find(c => c.value === currency)?.flag}</span>
            <span className="font-medium">{currency}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((curr) => (
          <SelectItem key={curr.value} value={curr.value}>
            <div className="flex items-center gap-2">
              <span>{curr.flag}</span>
              <span>{curr.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;