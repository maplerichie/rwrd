export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  image_url: string;
  price: number;
  description?: string;
  active: boolean;
  created_at: string;
} 