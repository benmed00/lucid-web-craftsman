import { Search } from 'lucide-react';

interface SearchResultsHeaderProps {
  searchQuery: string;
  totalResults: number;
  showingCount: number;
}

export const SearchResultsHeader = ({ 
  searchQuery, 
  totalResults, 
  showingCount 
}: SearchResultsHeaderProps) => {
  if (!searchQuery) return null;

  return (
    <div 
      className="mb-6 p-4 bg-secondary rounded-lg border border-border"
      role="region"
      aria-label="Résultats de recherche"
    >
      <div className="flex items-center gap-2 mb-2">
        <Search size={18} className="text-primary" aria-hidden="true" />
        <h2 className="text-lg font-medium text-foreground">
          Résultats de recherche
        </h2>
      </div>
      
      <p className="text-muted-foreground" aria-live="polite">
        {totalResults === 0 ? (
          <>
            Aucun résultat trouvé pour <strong className="text-foreground">"{searchQuery}"</strong>
          </>
        ) : totalResults === 1 ? (
          <>
            1 résultat trouvé pour <strong className="text-foreground">"{searchQuery}"</strong>
          </>
        ) : showingCount === totalResults ? (
          <>
            {totalResults} résultats trouvés pour <strong className="text-foreground">"{searchQuery}"</strong>
          </>
        ) : (
          <>
            Affichage de {showingCount} sur {totalResults} résultats pour <strong className="text-foreground">"{searchQuery}"</strong>
          </>
        )}
      </p>
    </div>
  );
};

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightText = ({ text, query, className = '' }: HighlightTextProps) => {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${query.trim()})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span
          key={index}
          className={
            part.toLowerCase() === query.toLowerCase() 
              ? 'bg-primary/20 text-foreground px-1 rounded font-medium' 
              : ''
          }
        >
          {part}
        </span>
      ))}
    </span>
  );
};