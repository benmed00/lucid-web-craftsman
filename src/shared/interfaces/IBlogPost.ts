// File_name: src/shared/interfaces/IBlogPost.ts

// Define the BlogPost interface to properly type the data
export interface IBlogPost {
    id: number;
    title: string;
    excerpt: string;
    content: string;
    image: string;
    date: string;
    author: string;
    category: string;
    featured?: boolean;
}

