import { IProduct } from "./Iproduct.interface";

// Cart API - using localStorage

export interface ICartItem {
  id: number;
  quantity: number;
  product: IProduct;
}

export interface CartState {
  items: ICartItem[];
  total: number;
}