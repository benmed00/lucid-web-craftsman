import { useParams } from 'react-router-dom';
import { useBlogPosts } from '@/hooks/api/useBlogPosts';
import BlogPost from './BlogPost';

const PostDetail = () => {
  const { id } = useParams();
  const { posts } = useBlogPosts();
  const post: BlogPost = posts?.find(post => post.id === Number(id));

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <div className="mb-4">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full rounded-lg"
        />
      </div>
      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
};

export default PostDetail;
