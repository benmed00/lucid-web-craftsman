export interface IProduct {
    id: number;
    name: string;
    price: number;
    images: string[];
    category: string;
    description: string;
    details: string;
    care: string;
    new?: boolean;
    artisan: string;
    artisanStory?: string;
    related?: number[];
}