export interface Borrowing {
  id: string;
  merchant_id: string;
  amount: number;
  transaction_id: string;
  current_revenue: number;
  current_trust_score: number;
  type: 'borrow' | 'repay' | 'penalty'
  created_at: string;
} 