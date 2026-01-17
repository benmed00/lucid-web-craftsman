/**
 * Tag Autocomplete Component
 * 
 * Provides autocomplete suggestions for blog tags from the database.
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTagTranslations } from "@/hooks/useTagTranslations";

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TagAutocomplete({ value, onChange, placeholder }: TagAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: allTags = [] } = useTagTranslations();

  // Parse current tags from the comma-separated value
  const currentTags = value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Filter suggestions based on input
  const filteredSuggestions = allTags.filter((tag) => {
    const searchTerm = inputValue.toLowerCase();
    const isAlreadySelected = currentTags.includes(tag.tag_key);
    const matchesSearch = 
      tag.tag_key.toLowerCase().includes(searchTerm) ||
      tag.fr.toLowerCase().includes(searchTerm) ||
      (tag.en && tag.en.toLowerCase().includes(searchTerm));
    return !isAlreadySelected && matchesSearch;
  });

  // Handle adding a tag
  const addTag = (tagKey: string) => {
    const newTags = [...currentTags, tagKey];
    onChange(newTags.join(", "));
    setInputValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle removing a tag
  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    onChange(newTags.join(", "));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        addTag(filteredSuggestions[selectedIndex].tag_key);
      } else if (inputValue.trim() && !currentTags.includes(inputValue.trim())) {
        // Add as new tag if not in suggestions
        addTag(inputValue.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && currentTags.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(currentTags[currentTags.length - 1]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => {
            const tagData = allTags.find((t) => t.tag_key === tag);
            return (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <Tag className="h-3 w-3" />
                {tag}
                {tagData && tagData.en && tagData.en !== tag && (
                  <span className="text-muted-foreground text-xs">
                    ({tagData.en})
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Input with Autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={currentTags.length > 0 ? "Ajouter un tag..." : placeholder}
            className="flex-1"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (inputValue || filteredSuggestions.length > 0) && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredSuggestions.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                  Tags disponibles ({filteredSuggestions.length})
                </div>
                {filteredSuggestions.map((tag, index) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between",
                      selectedIndex === index && "bg-muted"
                    )}
                    onClick={() => addTag(tag.tag_key)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tag.tag_key}</span>
                      <span className="text-muted-foreground text-sm">
                        {tag.en && tag.en !== tag.tag_key && `(${tag.en})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {tag.ar && <span dir="rtl">{tag.ar}</span>}
                    </div>
                  </button>
                ))}
              </>
            ) : inputValue.trim() ? (
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2",
                  selectedIndex === 0 && "bg-muted"
                )}
                onClick={() => addTag(inputValue.trim())}
              >
                <Plus className="h-4 w-4" />
                <span>Créer le tag "</span>
                <span className="font-medium">{inputValue.trim()}</span>
                <span>"</span>
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Tapez pour rechercher ou créer un tag
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Sélectionnez des tags existants ou créez-en de nouveaux. Les tags seront traduits automatiquement s'ils existent dans la base.
      </p>
    </div>
  );
}
