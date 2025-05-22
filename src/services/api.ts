// src/services/api.ts

import { BASE_URL } from '../config/constants';

export const fetchProducts = async () => {
    const response = await fetch(`${BASE_URL}/api/products`);
    return response.json();
};