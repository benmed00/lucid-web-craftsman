import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getBlogPosts } from '@/api/mockApiService';
import BlogCard from './BlogCard';

const BlogList = () => {
  const { t } = useTranslation('products');
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: getBlogPosts,
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p>{t('reviewsSection.loadingArticles')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default BlogList;
