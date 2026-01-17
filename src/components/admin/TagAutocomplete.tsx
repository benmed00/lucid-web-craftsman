/**
 * Tag Autocomplete Component with Auto-Translation
 * 
 * Provides autocomplete suggestions for blog tags from the database.
 * When creating a new tag, automatically suggests translations using AI.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Tag, Sparkles, Loader2, Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTagTranslations } from "@/hooks/useTagTranslations";
import { toast } from "sonner";

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface TranslationSuggestion {
  fr: string;
  en: string;
  ar: string;
  es: string;
  de: string;
}

export default function TagAutocomplete({ value, onChange, placeholder }: TagAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [translationSuggestion, setTranslationSuggestion] = useState<TranslationSuggestion | null>(null);
  const [editedTranslations, setEditedTranslations] = useState<TranslationSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: allTags = [] } = useTagTranslations();

  // Parse current tags from the comma-separated value
  const currentTags = value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Mutation to get AI translation suggestions
  const translateMutation = useMutation({
    mutationFn: async (tag: string) => {
      const { data, error } = await supabase.functions.invoke("translate-tag", {
        body: { tag, targetLanguages: ["en", "ar", "es", "de"] },
      });
      if (error) throw error;
      return data.translations as TranslationSuggestion;
    },
    onSuccess: (translations) => {
      setTranslationSuggestion(translations);
      setEditedTranslations(translations);
    },
    onError: (error) => {
      console.error("Translation error:", error);
      toast.error("Impossible de générer les traductions automatiques");
      // Create default translations with the tag as French
      if (pendingTag) {
        const defaultTranslations = {
          fr: pendingTag,
          en: "",
          ar: "",
          es: "",
          de: "",
        };
        setTranslationSuggestion(defaultTranslations);
        setEditedTranslations(defaultTranslations);
      }
    },
  });

  // Mutation to save the new tag with translations
  const saveTagMutation = useMutation({
    mutationFn: async (translations: TranslationSuggestion) => {
      const { error } = await supabase.from("tag_translations").insert({
        tag_key: translations.fr,
        fr: translations.fr,
        en: translations.en || null,
        ar: translations.ar || null,
        es: translations.es || null,
        de: translations.de || null,
      });
      if (error) throw error;
      return translations.fr;
    },
    onSuccess: (tagKey) => {
      queryClient.invalidateQueries({ queryKey: ["tag-translations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tag-translations"] });
      toast.success(`Tag "${tagKey}" créé avec traductions`);
      
      // Add the tag to the current selection
      const newTags = [...currentTags, tagKey];
      onChange(newTags.join(", "));
      
      // Reset state
      setShowTranslationPanel(false);
      setPendingTag(null);
      setTranslationSuggestion(null);
      setEditedTranslations(null);
      setInputValue("");
      inputRef.current?.focus();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

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

  // Check if the tag already exists
  const tagExists = allTags.some(
    (t) => t.tag_key.toLowerCase() === inputValue.trim().toLowerCase()
  );

  // Handle adding an existing tag
  const addTag = (tagKey: string) => {
    const newTags = [...currentTags, tagKey];
    onChange(newTags.join(", "));
    setInputValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle creating a new tag with translations
  const handleCreateNewTag = () => {
    const newTag = inputValue.trim();
    if (!newTag || tagExists) return;

    setPendingTag(newTag);
    setShowTranslationPanel(true);
    setShowSuggestions(false);
    
    // Request AI translations
    translateMutation.mutate(newTag);
  };

  // Handle removing a tag
  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    onChange(newTags.join(", "));
  };

  // Handle saving translations
  const handleSaveTranslations = () => {
    if (editedTranslations) {
      saveTagMutation.mutate(editedTranslations);
    }
  };

  // Handle canceling new tag creation
  const handleCancelNewTag = () => {
    setShowTranslationPanel(false);
    setPendingTag(null);
    setTranslationSuggestion(null);
    setEditedTranslations(null);
    setInputValue("");
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showTranslationPanel) return;

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
        handleCreateNewTag();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && currentTags.length > 0) {
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
      {!showTranslationPanel && (
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
              ) : null}
              
              {/* Create new tag option */}
              {inputValue.trim() && !tagExists && (
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-t",
                    filteredSuggestions.length === 0 && selectedIndex === 0 && "bg-muted"
                  )}
                  onClick={handleCreateNewTag}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Créer "</span>
                  <span className="font-medium">{inputValue.trim()}</span>
                  <span>" avec traductions IA</span>
                </button>
              )}

              {!inputValue.trim() && filteredSuggestions.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Tapez pour rechercher ou créer un tag
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Translation Panel for New Tags */}
      {showTranslationPanel && pendingTag && (
        <Card className="border-primary/50">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Nouveau tag : "{pendingTag}"</h4>
              {translateMutation.isPending && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Génération des traductions...
                </Badge>
              )}
              {translationSuggestion && !translateMutation.isPending && (
                <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600">
                  <Sparkles className="h-3 w-3" />
                  Traductions suggérées
                </Badge>
              )}
            </div>

            {editedTranslations && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">🇫🇷 Français</Label>
                  <Input
                    value={editedTranslations.fr}
                    onChange={(e) => setEditedTranslations({ ...editedTranslations, fr: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">🇬🇧 English</Label>
                  <Input
                    value={editedTranslations.en}
                    onChange={(e) => setEditedTranslations({ ...editedTranslations, en: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">🇲🇦 العربية</Label>
                  <Input
                    value={editedTranslations.ar}
                    onChange={(e) => setEditedTranslations({ ...editedTranslations, ar: e.target.value })}
                    className="h-8"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">🇪🇸 Español</Label>
                  <Input
                    value={editedTranslations.es}
                    onChange={(e) => setEditedTranslations({ ...editedTranslations, es: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2 sm:w-1/2">
                  <Label className="text-xs">🇩🇪 Deutsch</Label>
                  <Input
                    value={editedTranslations.de}
                    onChange={(e) => setEditedTranslations({ ...editedTranslations, de: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelNewTag}
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveTranslations}
                disabled={saveTagMutation.isPending || !editedTranslations?.fr}
              >
                {saveTagMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Créer le tag
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      {!showTranslationPanel && (
        <p className="text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Sélectionnez des tags existants ou créez-en de nouveaux avec traductions IA automatiques.
        </p>
      )}
    </div>
  );
}
