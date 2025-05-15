export interface Purchase {
  id: string;
  customer_id: string;
  merchant_id: string;
  product_id: string;
  subscription_id?: string;
  amount: number;
  transaction_id: string;
  yield_used: number;
  principal_used: number;
  external_used: number;
  type: 'item' | 'subscription';
  created_at: string;
} 