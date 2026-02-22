/**
 * Enhanced Blog Editor Component
 *
 * Features:
 * - Markdown editor with live preview
 * - Image upload with drag & drop
 * - Translation management with language tabs
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MDEditor from '@uiw/react-md-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Globe,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  Tag,
  Languages,
  Eye,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { blogImageUploadService } from '@/services/blogImageUploadService';
import TagAutocomplete from './TagAutocomplete';

// Supported locales
const SUPPORTED_LOCALES = ['fr', 'en', 'ar', 'es', 'de'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  de: 'Deutsch',
};

const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇲🇦',
  es: '🇪🇸',
  de: '🇩🇪',
};

interface BlogPostFormData {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_id: string | null;
  status: string | null;
  is_featured: boolean | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
}

interface BlogTranslation {
  id?: string;
  blog_post_id: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface BlogEditorProps {
  formData: BlogPostFormData;
  setFormData: (data: BlogPostFormData) => void;
  tagsInput: string;
  setTagsInput: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  mode: 'create' | 'edit';
  generateSlug: (title: string) => string;
  editingPostId?: string;
}

export default function BlogEditor({
  formData,
  setFormData,
  tagsInput,
  setTagsInput,
  onSubmit,
  onCancel,
  isSubmitting,
  isValid,
  mode,
  generateSlug,
  editingPostId,
}: BlogEditorProps) {
  const [activeTab, setActiveTab] = useState<
    'content' | 'translations' | 'media'
  >('content');
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');
  const [translations, setTranslations] = useState<
    Record<SupportedLocale, Partial<BlogTranslation>>
  >({
    fr: {
      locale: 'fr',
      title: '',
      excerpt: '',
      content: '',
      seo_title: '',
      seo_description: '',
    },
    en: {
      locale: 'en',
      title: '',
      excerpt: '',
      content: '',
      seo_title: '',
      seo_description: '',
    },
    ar: {
      locale: 'ar',
      title: '',
      excerpt: '',
      content: '',
      seo_title: '',
      seo_description: '',
    },
    es: {
      locale: 'es',
      title: '',
      excerpt: '',
      content: '',
      seo_title: '',
      seo_description: '',
    },
    de: {
      locale: 'de',
      title: '',
      excerpt: '',
      content: '',
      seo_title: '',
      seo_description: '',
    },
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [contentImages, setContentImages] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Define the translation type from Supabase
  type BlogTranslationRow = {
    id: string;
    blog_post_id: string;
    locale: string;
    title: string;
    excerpt: string | null;
    content: string;
    seo_title: string | null;
    seo_description: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  // Fetch existing translations when editing
  const { data: existingTranslations } = useQuery({
    queryKey: ['blog-post-translations', editingPostId],
    queryFn: async () => {
      if (!editingPostId) return [];
      const { data, error } = await supabase
        .from('blog_post_translations')
        .select('*')
        .eq('blog_post_id', editingPostId);
      if (error) throw error;
      return data as BlogTranslationRow[];
    },
    enabled: mode === 'edit' && !!editingPostId,
  });

  // Load existing translations into state
  useEffect(() => {
    if (existingTranslations) {
      const translationMap = { ...translations };
      existingTranslations.forEach((trans) => {
        const locale = trans.locale as SupportedLocale;
        if (SUPPORTED_LOCALES.includes(locale)) {
          translationMap[locale] = {
            id: trans.id,
            blog_post_id: trans.blog_post_id,
            locale: trans.locale,
            title: trans.title || '',
            excerpt: trans.excerpt || '',
            content: trans.content || '',
            seo_title: trans.seo_title || '',
            seo_description: trans.seo_description || '',
          };
        }
      });
      setTranslations(translationMap);
    }
  }, [existingTranslations]);

  // Save translation mutation
  const saveTranslationMutation = useMutation({
    mutationFn: async ({
      locale,
      translation,
    }: {
      locale: SupportedLocale;
      translation: Partial<BlogTranslation>;
    }) => {
      if (!editingPostId) throw new Error('Post ID required');

      const translationData = {
        blog_post_id: editingPostId,
        locale,
        title: translation.title || '',
        excerpt: translation.excerpt || null,
        content: translation.content || '',
        seo_title: translation.seo_title || null,
        seo_description: translation.seo_description || null,
      };

      if (translation.id) {
        // Update existing
        const { error } = await supabase
          .from('blog_post_translations')
          .update(translationData)
          .eq('id', translation.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('blog_post_translations')
          .insert(translationData);
        if (error) throw error;
      }
    },
    onSuccess: (_, { locale }) => {
      toast.success(`Traduction ${LOCALE_LABELS[locale]} enregistrée`);
      queryClient.invalidateQueries({
        queryKey: ['blog-post-translations', editingPostId],
      });
    },
    onError: (error) => {
      console.error('Error saving translation:', error);
      toast.error('Erreur lors de la sauvegarde de la traduction');
    },
  });

  // Handle featured image upload
  const handleFeaturedImageUpload = useCallback(
    async (file: File) => {
      const validation = blogImageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      setIsUploadingImage(true);
      try {
        const result = await blogImageUploadService.uploadBlogImage(
          file,
          editingPostId
        );
        setFormData({ ...formData, featured_image_url: result.url });
        toast.success('Image principale uploadée avec succès');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload de l'image");
      } finally {
        setIsUploadingImage(false);
      }
    },
    [formData, setFormData, editingPostId]
  );

  // Handle content image upload (for markdown)
  const handleContentImageUpload = useCallback(
    async (file: File) => {
      const validation = blogImageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        return null;
      }

      try {
        const result = await blogImageUploadService.uploadBlogImage(
          file,
          editingPostId
        );
        setContentImages((prev) => [...prev, result.url]);
        return result.url;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload de l'image");
        return null;
      }
    },
    [editingPostId]
  );

  // Insert image into markdown content
  const insertImageIntoContent = async (file: File) => {
    const url = await handleContentImageUpload(file);
    if (url) {
      const imageMarkdown = `\n![Image](${url})\n`;
      setFormData({ ...formData, content: formData.content + imageMarkdown });
    }
  };

  const updateTranslation = (
    locale: SupportedLocale,
    field: keyof BlogTranslation,
    value: string
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  };

  const handleSaveTranslation = (locale: SupportedLocale) => {
    if (!editingPostId) {
      toast.error(
        "Veuillez d'abord créer l'article avant d'ajouter des traductions"
      );
      return;
    }
    saveTranslationMutation.mutate({
      locale,
      translation: translations[locale],
    });
  };

  const getTranslationStatus = (locale: SupportedLocale) => {
    const trans = translations[locale];
    if (!trans.title && !trans.content) return 'empty';
    if (trans.title && trans.content) return 'complete';
    return 'partial';
  };

  return (
    <DialogContent className="max-w-5xl max-h-[95vh] p-0">
      <DialogHeader className="px-6 pt-6 pb-0">
        <DialogTitle className="text-xl">
          {mode === 'create' ? 'Nouvel article' : "Modifier l'article"}
        </DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Créez un nouvel article de blog avec traductions'
            : "Modifiez les informations de l'article et ses traductions"}
        </DialogDescription>
      </DialogHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1"
      >
        <div className="px-6 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1 gap-2">
              <FileText className="h-4 w-4" />
              Contenu principal
            </TabsTrigger>
            <TabsTrigger value="translations" className="flex-1 gap-2">
              <Languages className="h-4 w-4" />
              Traductions
              {mode === 'edit' && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {
                    SUPPORTED_LOCALES.filter(
                      (l) => getTranslationStatus(l) !== 'empty'
                    ).length
                  }
                  /{SUPPORTED_LOCALES.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 gap-2">
              <ImageIcon className="h-4 w-4" />
              Médias
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea
          className="flex-1 px-6 py-4"
          style={{ height: 'calc(95vh - 250px)' }}
        >
          {/* Content Tab */}
          <TabsContent value="content" className="mt-0 space-y-6">
            {/* Title & Slug */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Titre de l'article"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0 text-xs"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        slug: generateSlug(formData.title),
                      })
                    }
                  >
                    Générer
                  </Button>
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="url-de-larticle"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Extrait</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt || ''}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="Résumé court de l'article..."
                rows={2}
              />
            </div>

            {/* Markdown Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contenu * (Markdown)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) insertImageIntoContent(file);
                      };
                      input.click();
                    }}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Insérer image
                  </Button>
                </div>
              </div>
              <div
                data-color-mode="light"
                className="border rounded-lg overflow-hidden"
              >
                <MDEditor
                  value={formData.content}
                  onChange={(val) =>
                    setFormData({ ...formData, content: val || '' })
                  }
                  height={400}
                  preview="live"
                  hideToolbar={false}
                />
              </div>
            </div>

            {/* Tags with Autocomplete */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagAutocomplete
                value={tagsInput}
                onChange={setTagsInput}
                placeholder="Rechercher ou créer des tags..."
              />
            </div>

            {/* Status & Featured */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Article à la une</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher en vedette
                  </p>
                </div>
                <Switch
                  checked={formData.is_featured || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_featured: checked })
                  }
                />
              </div>
            </div>

            {/* SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seo_title">Titre SEO</Label>
                    <Input
                      id="seo_title"
                      value={formData.seo_title || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, seo_title: e.target.value })
                      }
                      placeholder="Titre optimisé pour les moteurs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo_description">Description SEO</Label>
                    <Input
                      id="seo_description"
                      value={formData.seo_description || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seo_description: e.target.value,
                        })
                      }
                      placeholder="Description pour les résultats"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translations Tab */}
          <TabsContent value="translations" className="mt-0 space-y-4">
            {mode === 'create' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        Article non créé
                      </p>
                      <p className="text-sm text-amber-700">
                        Veuillez d'abord créer l'article avant d'ajouter des
                        traductions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {SUPPORTED_LOCALES.map((locale) => {
                const status = getTranslationStatus(locale);
                return (
                  <Button
                    key={locale}
                    variant={activeLocale === locale ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveLocale(locale)}
                    className="gap-2"
                    disabled={mode === 'create'}
                  >
                    <span>{LOCALE_FLAGS[locale]}</span>
                    <span>{LOCALE_LABELS[locale]}</span>
                    {status === 'complete' && (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                    {status === 'partial' && (
                      <Badge variant="secondary" className="text-xs">
                        Partiel
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>

            {mode === 'edit' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{LOCALE_FLAGS[activeLocale]}</span>
                    Traduction {LOCALE_LABELS[activeLocale]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={translations[activeLocale]?.title || ''}
                      onChange={(e) =>
                        updateTranslation(activeLocale, 'title', e.target.value)
                      }
                      placeholder={`Titre en ${LOCALE_LABELS[activeLocale]}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Extrait</Label>
                    <Textarea
                      value={translations[activeLocale]?.excerpt || ''}
                      onChange={(e) =>
                        updateTranslation(
                          activeLocale,
                          'excerpt',
                          e.target.value
                        )
                      }
                      placeholder={`Extrait en ${LOCALE_LABELS[activeLocale]}`}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contenu (Markdown)</Label>
                    <div
                      data-color-mode="light"
                      className="border rounded-lg overflow-hidden"
                    >
                      <MDEditor
                        value={translations[activeLocale]?.content || ''}
                        onChange={(val) =>
                          updateTranslation(activeLocale, 'content', val || '')
                        }
                        height={300}
                        preview="live"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Titre SEO</Label>
                      <Input
                        value={translations[activeLocale]?.seo_title || ''}
                        onChange={(e) =>
                          updateTranslation(
                            activeLocale,
                            'seo_title',
                            e.target.value
                          )
                        }
                        placeholder="Titre SEO"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description SEO</Label>
                      <Input
                        value={
                          translations[activeLocale]?.seo_description || ''
                        }
                        onChange={(e) =>
                          updateTranslation(
                            activeLocale,
                            'seo_description',
                            e.target.value
                          )
                        }
                        placeholder="Description SEO"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveTranslation(activeLocale)}
                      disabled={saveTranslationMutation.isPending}
                    >
                      {saveTranslationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Enregistrer la traduction
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="mt-0 space-y-6">
            {/* Featured Image Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Image principale</CardTitle>
              </CardHeader>
              <CardContent>
                <FeaturedImageUpload
                  currentImage={formData.featured_image_url}
                  onUpload={handleFeaturedImageUpload}
                  onRemove={() =>
                    setFormData({ ...formData, featured_image_url: null })
                  }
                  isUploading={isUploadingImage}
                />
              </CardContent>
            </Card>

            {/* Content Images Gallery */}
            {contentImages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Images du contenu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {contentImages.map((url, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border"
                      >
                        <img
                          src={url}
                          alt={`Content ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(`![Image](${url})`);
                              toast.success('Markdown copié !');
                            }}
                          >
                            Copier Markdown
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload new content image */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Ajouter une image au contenu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContentImageUploader onUpload={insertImageIntoContent} />
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <DialogFooter className="px-6 py-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting || !isValid}>
          {isSubmitting
            ? 'Enregistrement...'
            : mode === 'create'
              ? "Créer l'article"
              : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Featured Image Upload Component
function FeaturedImageUpload({
  currentImage,
  onUpload,
  onRemove,
  isUploading,
}: {
  currentImage: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg transition-all cursor-pointer',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => document.getElementById('featured-image-input')?.click()}
    >
      <input
        id="featured-image-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentImage ? (
        <div className="relative group">
          <img
            src={currentImage}
            alt="Featured"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Changer
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                Glissez une image ou cliquez pour sélectionner
              </p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG, WEBP • Max 5MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Content Image Uploader Component
function ContentImageUploader({
  onUpload,
}: {
  onUpload: (file: File) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setIsUploading(true);
      await onUpload(file);
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      await onUpload(file);
      setIsUploading(false);
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => document.getElementById('content-image-input')?.click()}
    >
      <input
        id="content-image-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex flex-col items-center space-y-2">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading
            ? 'Upload en cours...'
            : "Glissez une image ou cliquez pour l'ajouter au contenu"}
        </p>
      </div>
    </div>
  );
}
