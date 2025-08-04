export interface Product {
    id: number;
    name: string;
    price: number;
    images: string[];
    category: string;
    description: string;
    details: string;
    care: string;
    new?: boolean;
    is_new?: boolean;
    artisan: string;
    artisanStory?: string;
    artisan_story?: string;
    related?: number[];
    related_products?: number[];
    created_at?: string;
    updated_at?: string;
}