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
    <div className="mb-6 p-4 bg-stone-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-2">
        <Search size={18} className="text-olive-700" />
        <h2 className="text-lg font-medium text-stone-800">
          Résultats de recherche
        </h2>
      </div>
      
      <p className="text-stone-600">
        {totalResults === 0 ? (
          <>
            Aucun résultat trouvé pour <strong>"{searchQuery}"</strong>
          </>
        ) : totalResults === 1 ? (
          <>
            1 résultat trouvé pour <strong>"{searchQuery}"</strong>
          </>
        ) : showingCount === totalResults ? (
          <>
            {totalResults} résultats trouvés pour <strong>"{searchQuery}"</strong>
          </>
        ) : (
          <>
            Affichage de {showingCount} sur {totalResults} résultats pour <strong>"{searchQuery}"</strong>
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
              ? 'bg-yellow-200 px-1 rounded font-medium' 
              : ''
          }
        >
          {part}
        </span>
      ))}
    </span>
  );
};