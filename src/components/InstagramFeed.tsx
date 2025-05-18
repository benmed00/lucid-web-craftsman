
const instagramPosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    likes: 254,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    likes: 187,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    likes: 315,
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    likes: 201,
  },
];

const InstagramFeed = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {instagramPosts.map((post) => (
        <a 
          key={post.id} 
          href="#" 
          className="block relative group overflow-hidden rounded-md aspect-square"
        >
          <img 
            src={post.image} 
            alt={`Instagram post ${post.id}`} 
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity duration-300">
            <div className="text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{post.likes}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default InstagramFeed;
