export interface SubscriptionProgram {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  description?: string;
  quota: number;
  product_ids: string[];
  max_duration: number; // timestamp in seconds
  active: boolean;
  created_at: string;
} 