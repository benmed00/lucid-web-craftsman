/**
 * Admin Blog Manager
 *
 * Create, edit, delete and manage blog posts from the admin dashboard.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Tag,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BlogEditor from '@/components/admin/BlogEditor';

interface BlogPost {
  id: string;
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
  view_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

type BlogPostFormData = Omit<
  BlogPost,
  'id' | 'view_count' | 'created_at' | 'updated_at'
>;

const initialFormData: BlogPostFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image_url: '',
  author_id: null,
  status: 'draft',
  is_featured: false,
  tags: [],
  seo_title: '',
  seo_description: '',
  published_at: null,
};

export default function AdminBlog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<BlogPostFormData>(initialFormData);
  const [tagsInput, setTagsInput] = useState('');
  const queryClient = useQueryClient();

  // Fetch all blog posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: BlogPostFormData) => {
      const { error } = await supabase.from('blog_posts').insert({
        ...data,
        published_at:
          data.status === 'published' ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Article créé avec succès');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast.error("Erreur lors de la création de l'article");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: BlogPostFormData;
    }) => {
      const updateData: BlogPostFormData & {
        updated_at: string;
        published_at?: string | null;
      } = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Set published_at if status changes to published
      if (data.status === 'published' && !editingPost?.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Article mis à jour avec succès');
      setEditingPost(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating post:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Article supprimé avec succès');
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setTagsInput('');
  };

  const handleEditClick = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      featured_image_url: post.featured_image_url || '',
      author_id: post.author_id,
      status: post.status || 'draft',
      is_featured: post.is_featured || false,
      tags: post.tags || [],
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      published_at: post.published_at,
    });
    setTagsInput(post.tags?.join(', ') || '');
  };

  const handleSubmit = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const dataToSubmit = {
      ...formData,
      tags,
      slug: formData.slug || generateSlug(formData.title),
    };

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-200">
            Publié
          </Badge>
        );
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'archived':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Archivé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const isFormValid =
    formData.title.trim().length > 0 && formData.content.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Gestion du Blog
          </h1>
          <p className="text-muted-foreground">
            Créez, modifiez et gérez vos articles de blog
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel article
            </Button>
          </DialogTrigger>
          <BlogEditor
            formData={formData}
            setFormData={setFormData}
            tagsInput={tagsInput}
            setTagsInput={setTagsInput}
            onSubmit={handleSubmit}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
            isValid={isFormValid}
            mode="create"
            generateSlug={generateSlug}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="published">Publiés</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
                <SelectItem value="archived">Archivés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-sm text-muted-foreground">Total articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === 'published').length}
            </div>
            <p className="text-sm text-muted-foreground">Publiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {posts.filter((p) => p.status === 'draft').length}
            </div>
            <p className="text-sm text-muted-foreground">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {posts.filter((p) => p.is_featured).length}
            </div>
            <p className="text-sm text-muted-foreground">À la une</p>
          </CardContent>
        </Card>
      </div>

      {/* Blog Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Articles ({filteredPosts.length})</CardTitle>
          <CardDescription>Liste de tous vos articles de blog</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun article trouvé</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier article
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Vues</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {post.is_featured && (
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              ⭐ Featured
                            </Badge>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              /{post.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {post.tags?.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {(post.tags?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(post.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {post.view_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.published_at || post.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(`/blog/${post.id}`, '_blank')
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Dialog
                            open={editingPost?.id === post.id}
                            onOpenChange={(open) =>
                              !open && setEditingPost(null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(post)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <BlogEditor
                              formData={formData}
                              setFormData={setFormData}
                              tagsInput={tagsInput}
                              setTagsInput={setTagsInput}
                              onSubmit={handleSubmit}
                              onCancel={() => setEditingPost(null)}
                              isSubmitting={updateMutation.isPending}
                              isValid={isFormValid}
                              mode="edit"
                              generateSlug={generateSlug}
                              editingPostId={post.id}
                            />
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Supprimer cet article ?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. L'article "
                                  {post.title}" sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(post.id)}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
