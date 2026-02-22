/**
 * Admin Translations Page
 *
 * Manage product and blog post translations from the admin dashboard.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Languages,
  Plus,
  Edit,
  Check,
  X,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import {
  SUPPORTED_LOCALES,
  SupportedLocale,
  DEFAULT_LOCALE,
} from '@/services/translationService';

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  de: 'Deutsch',
};

interface ProductForTranslation {
  id: number;
  name: string;
  category: string;
  translations: {
    locale: SupportedLocale;
    name: string;
    id: string;
  }[];
}

interface BlogPostForTranslation {
  id: string;
  title: string;
  slug: string;
  translations: {
    locale: SupportedLocale;
    title: string;
    id: string;
  }[];
}

export default function AdminTranslations() {
  const [activeTab, setActiveTab] = useState('products');
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingBlogPost, setEditingBlogPost] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>('en');
  const queryClient = useQueryClient();

  // Fetch products with their translations
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-translations'],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
        .order('id');

      if (productsError) throw productsError;

      const { data: translations, error: transError } = await supabase
        .from('product_translations')
        .select('id, product_id, locale, name');

      if (transError) throw transError;

      return products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        translations: translations
          .filter((t) => t.product_id === p.id)
          .map((t) => ({
            locale: t.locale as SupportedLocale,
            name: t.name,
            id: t.id,
          })),
      })) as ProductForTranslation[];
    },
  });

  // Fetch blog posts with their translations
  const { data: blogPosts = [], isLoading: blogPostsLoading } = useQuery({
    queryKey: ['admin-blog-translations'],
    queryFn: async () => {
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const { data: translations, error: transError } = await supabase
        .from('blog_post_translations')
        .select('id, blog_post_id, locale, title');

      if (transError) throw transError;

      return posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        translations: translations
          .filter((t) => t.blog_post_id === p.id)
          .map((t) => ({
            locale: t.locale as SupportedLocale,
            title: t.title,
            id: t.id,
          })),
      })) as BlogPostForTranslation[];
    },
  });

  const getMissingLocales = (
    translations: { locale: SupportedLocale }[]
  ): SupportedLocale[] => {
    const existingLocales = translations.map((t) => t.locale);
    return SUPPORTED_LOCALES.filter((l) => !existingLocales.includes(l));
  };

  const getTranslationStatus = (
    translations: { locale: SupportedLocale }[]
  ) => {
    const count = translations.length;
    const total = SUPPORTED_LOCALES.length;

    if (count === total) {
      return {
        status: 'complete',
        label: 'Complet',
        variant: 'default' as const,
      };
    } else if (count >= total / 2) {
      return {
        status: 'partial',
        label: `${count}/${total}`,
        variant: 'secondary' as const,
      };
    } else {
      return {
        status: 'incomplete',
        label: `${count}/${total}`,
        variant: 'destructive' as const,
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Languages className="h-6 w-6" />
            Gestion des traductions
          </h1>
          <p className="text-muted-foreground">
            Gérez les traductions des produits et articles de blog
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {SUPPORTED_LOCALES.length} langues supportées
        </Badge>
      </div>

      {/* Language Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Langues disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LOCALES.map((locale) => (
              <Badge
                key={locale}
                variant={locale === DEFAULT_LOCALE ? 'default' : 'secondary'}
                className="text-sm"
              >
                <Globe className="h-3 w-3 mr-1" />
                {LOCALE_NAMES[locale]}
                {locale === DEFAULT_LOCALE && ' (par défaut)'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">
            Produits ({products.length})
          </TabsTrigger>
          <TabsTrigger value="blog">
            Articles de blog ({blogPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traductions des produits</CardTitle>
              <CardDescription>
                Gérez les traductions pour chaque produit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Traductions</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const status = getTranslationStatus(product.translations);
                      const missingLocales = getMissingLocales(
                        product.translations
                      );

                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-sm">
                            {product.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {product.translations.map((t) => (
                                <Badge
                                  key={t.locale}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {t.locale.toUpperCase()}
                                </Badge>
                              ))}
                              {missingLocales.map((locale) => (
                                <Badge
                                  key={locale}
                                  variant="outline"
                                  className="text-xs text-muted-foreground"
                                >
                                  {locale.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              {status.status === 'complete' ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ProductTranslationDialog
                              product={product}
                              onSuccess={() =>
                                queryClient.invalidateQueries({
                                  queryKey: ['admin-products-translations'],
                                })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traductions des articles de blog</CardTitle>
              <CardDescription>
                Gérez les traductions pour chaque article
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blogPostsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Traductions</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogPosts.map((post) => {
                      const status = getTranslationStatus(post.translations);
                      const missingLocales = getMissingLocales(
                        post.translations
                      );

                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {post.title}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {post.slug}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {post.translations.map((t) => (
                                <Badge
                                  key={t.locale}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {t.locale.toUpperCase()}
                                </Badge>
                              ))}
                              {missingLocales.map((locale) => (
                                <Badge
                                  key={locale}
                                  variant="outline"
                                  className="text-xs text-muted-foreground"
                                >
                                  {locale.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              {status.status === 'complete' ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <BlogTranslationDialog
                              blogPost={post}
                              onSuccess={() =>
                                queryClient.invalidateQueries({
                                  queryKey: ['admin-blog-translations'],
                                })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Product Translation Dialog Component
function ProductTranslationDialog({
  product,
  onSuccess,
}: {
  product: ProductForTranslation;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>('en');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    details: '',
    care: '',
    artisan_story: '',
    seo_title: '',
    seo_description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const existingTranslation = product.translations.find(
    (t) => t.locale === selectedLocale
  );

  // Load existing translation data when locale changes
  const loadTranslation = async () => {
    if (!existingTranslation) {
      setFormData({
        name: '',
        description: '',
        short_description: '',
        details: '',
        care: '',
        artisan_story: '',
        seo_title: '',
        seo_description: '',
      });
      return;
    }

    const { data } = await supabase
      .from('product_translations')
      .select('*')
      .eq('id', existingTranslation.id)
      .single();

    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        short_description: data.short_description || '',
        details: data.details || '',
        care: data.care || '',
        artisan_story: data.artisan_story || '',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (existingTranslation) {
        // Update existing
        const { error } = await supabase
          .from('product_translations')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTranslation.id);

        if (error) throw error;
        toast.success('Traduction mise à jour');
      } else {
        // Insert new
        const { error } = await supabase.from('product_translations').insert({
          product_id: product.id,
          locale: selectedLocale,
          ...formData,
        });

        if (error) throw error;
        toast.success('Traduction ajoutée');
      }

      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error('Error saving translation:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Éditer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traduction du produit: {product.name}</DialogTitle>
          <DialogDescription>
            Éditez les traductions pour ce produit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Langue:</Label>
            <Select
              value={selectedLocale}
              onValueChange={(v) => {
                setSelectedLocale(v as SupportedLocale);
                setTimeout(loadTranslation, 0);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {LOCALE_NAMES[locale]}
                    {product.translations.find((t) => t.locale === locale) &&
                      ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={loadTranslation}>
              Charger
            </Button>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nom du produit</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nom traduit..."
              />
            </div>

            <div>
              <Label htmlFor="short_description">Description courte</Label>
              <Input
                id="short_description"
                value={formData.short_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    short_description: e.target.value,
                  })
                }
                placeholder="Description courte..."
              />
            </div>

            <div>
              <Label htmlFor="description">Description complète</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description complète..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="details">Détails</Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
                placeholder="Détails du produit..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="care">Instructions d'entretien</Label>
              <Textarea
                id="care"
                value={formData.care}
                onChange={(e) =>
                  setFormData({ ...formData, care: e.target.value })
                }
                placeholder="Instructions d'entretien..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="artisan_story">Histoire de l'artisan</Label>
              <Textarea
                id="artisan_story"
                value={formData.artisan_story}
                onChange={(e) =>
                  setFormData({ ...formData, artisan_story: e.target.value })
                }
                placeholder="Histoire de l'artisan..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seo_title">Titre SEO</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title}
                  onChange={(e) =>
                    setFormData({ ...formData, seo_title: e.target.value })
                  }
                  placeholder="Titre SEO..."
                />
              </div>
              <div>
                <Label htmlFor="seo_description">Description SEO</Label>
                <Input
                  id="seo_description"
                  value={formData.seo_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seo_description: e.target.value,
                    })
                  }
                  placeholder="Description SEO..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.name}>
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Blog Translation Dialog Component
function BlogTranslationDialog({
  blogPost,
  onSuccess,
}: {
  blogPost: BlogPostForTranslation;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>('en');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    seo_title: '',
    seo_description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const existingTranslation = blogPost.translations.find(
    (t) => t.locale === selectedLocale
  );

  const loadTranslation = async () => {
    if (!existingTranslation) {
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        seo_title: '',
        seo_description: '',
      });
      return;
    }

    const { data } = await supabase
      .from('blog_post_translations')
      .select('*')
      .eq('id', existingTranslation.id)
      .single();

    if (data) {
      setFormData({
        title: data.title || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (existingTranslation) {
        const { error } = await supabase
          .from('blog_post_translations')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTranslation.id);

        if (error) throw error;
        toast.success('Traduction mise à jour');
      } else {
        const { error } = await supabase.from('blog_post_translations').insert({
          blog_post_id: blogPost.id,
          locale: selectedLocale,
          ...formData,
        });

        if (error) throw error;
        toast.success('Traduction ajoutée');
      }

      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error('Error saving translation:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Éditer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traduction de l'article</DialogTitle>
          <DialogDescription>{blogPost.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Langue:</Label>
            <Select
              value={selectedLocale}
              onValueChange={(v) => {
                setSelectedLocale(v as SupportedLocale);
                setTimeout(loadTranslation, 0);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {LOCALE_NAMES[locale]}
                    {blogPost.translations.find((t) => t.locale === locale) &&
                      ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={loadTranslation}>
              Charger
            </Button>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre traduit..."
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Extrait</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="Extrait de l'article..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Contenu complet de l'article..."
                rows={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seo_title">Titre SEO</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title}
                  onChange={(e) =>
                    setFormData({ ...formData, seo_title: e.target.value })
                  }
                  placeholder="Titre SEO..."
                />
              </div>
              <div>
                <Label htmlFor="seo_description">Description SEO</Label>
                <Input
                  id="seo_description"
                  value={formData.seo_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seo_description: e.target.value,
                    })
                  }
                  placeholder="Description SEO..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !formData.title}
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
