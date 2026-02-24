import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Languages, Search } from 'lucide-react';
import type { TagTranslation } from '@/hooks/useTagTranslations';

interface TagFormData {
  tag_key: string;
  fr: string;
  en: string;
  ar: string;
  es: string;
  de: string;
}

const initialFormData: TagFormData = {
  tag_key: '',
  fr: '',
  en: '',
  ar: '',
  es: '',
  de: '',
};

const AdminTags = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagTranslation | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagTranslation | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);

  // Fetch tags
  const { data: tags, isLoading } = useQuery({
    queryKey: ['admin-tag-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_translations')
        .select('*')
        .order('tag_key');
      if (error) throw error;
      return data as TagTranslation[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      const { error } = await supabase.from('tag_translations').insert({
        tag_key: data.tag_key,
        fr: data.fr,
        en: data.en || null,
        ar: data.ar || null,
        es: data.es || null,
        de: data.de || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-translations'] });
      queryClient.invalidateQueries({ queryKey: ['tag-translations'] });
      toast.success('Tag créé avec succès');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TagFormData }) => {
      const { error } = await supabase
        .from('tag_translations')
        .update({
          tag_key: data.tag_key,
          fr: data.fr,
          en: data.en || null,
          ar: data.ar || null,
          es: data.es || null,
          de: data.de || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-translations'] });
      queryClient.invalidateQueries({ queryKey: ['tag-translations'] });
      toast.success('Tag mis à jour avec succès');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tag_translations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-translations'] });
      queryClient.invalidateQueries({ queryKey: ['tag-translations'] });
      toast.success('Tag supprimé avec succès');
      setIsDeleteDialogOpen(false);
      setTagToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingTag(null);
    setIsDialogOpen(false);
  };

  const handleEditClick = (tag: TagTranslation) => {
    setEditingTag(tag);
    setFormData({
      tag_key: tag.tag_key,
      fr: tag.fr,
      en: tag.en || '',
      ar: tag.ar || '',
      es: tag.es || '',
      de: tag.de || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tag_key || !formData.fr) {
      toast.error('Le tag et la traduction française sont obligatoires');
      return;
    }

    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (tag: TagTranslation) => {
    setTagToDelete(tag);
    setIsDeleteDialogOpen(true);
  };

  const filteredTags = tags?.filter(
    (tag) =>
      tag.tag_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTranslationCount = (tag: TagTranslation) => {
    let count = 1; // fr is always present
    if (tag.en) count++;
    if (tag.ar) count++;
    if (tag.es) count++;
    if (tag.de) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Gestion des Tags
          </h1>
          <p className="text-muted-foreground">
            Gérez les traductions des tags du blog
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tags?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entièrement traduits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {tags?.filter((t) => getTranslationCount(t) === 5).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Traductions manquantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {tags?.filter((t) => getTranslationCount(t) < 5).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Liste des Tags
          </CardTitle>
          <CardDescription>
            Cliquez sur un tag pour modifier ses traductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>FR</TableHead>
                    <TableHead>EN</TableHead>
                    <TableHead>AR</TableHead>
                    <TableHead>ES</TableHead>
                    <TableHead>DE</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Aucun tag trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTags?.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-medium">
                          {tag.tag_key}
                        </TableCell>
                        <TableCell>{tag.fr}</TableCell>
                        <TableCell>
                          {tag.en || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell dir="rtl">
                          {tag.ar || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tag.es || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tag.de || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              getTranslationCount(tag) === 5
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              getTranslationCount(tag) === 5
                                ? 'bg-green-100 text-green-800'
                                : ''
                            }
                          >
                            {getTranslationCount(tag)}/5
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(tag)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(tag)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Modifier le tag' : 'Nouveau tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Modifiez les traductions du tag'
                : 'Ajoutez un nouveau tag avec ses traductions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag_key">Clé du tag *</Label>
              <Input
                id="tag_key"
                value={formData.tag_key}
                onChange={(e) =>
                  setFormData({ ...formData, tag_key: e.target.value })
                }
                placeholder="Ex: Artisanat"
                disabled={!!editingTag}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr">Français *</Label>
              <Input
                id="fr"
                value={formData.fr}
                onChange={(e) =>
                  setFormData({ ...formData, fr: e.target.value })
                }
                placeholder="Artisanat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="en">Anglais</Label>
              <Input
                id="en"
                value={formData.en}
                onChange={(e) =>
                  setFormData({ ...formData, en: e.target.value })
                }
                placeholder="Craftsmanship"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ar">Arabe</Label>
              <Input
                id="ar"
                dir="rtl"
                value={formData.ar}
                onChange={(e) =>
                  setFormData({ ...formData, ar: e.target.value })
                }
                placeholder="حرفة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es">Espagnol</Label>
              <Input
                id="es"
                value={formData.es}
                onChange={(e) =>
                  setFormData({ ...formData, es: e.target.value })
                }
                placeholder="Artesanía"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="de">Allemand</Label>
              <Input
                id="de"
                value={formData.de}
                onChange={(e) =>
                  setFormData({ ...formData, de: e.target.value })
                }
                placeholder="Handwerk"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingTag ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tag ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le tag "{tagToDelete?.tag_key}"
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                tagToDelete && deleteMutation.mutate(tagToDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTags;
